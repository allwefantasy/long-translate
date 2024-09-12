from fastapi import (
    FastAPI,
    HTTPException,
    Request,
    BackgroundTasks,
    BackgroundTasks,
    Header,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import byzerllm
from byzerllm.utils.langutil import asyncfy_with_semaphore
import re
import time
import logging
import json
from datetime import datetime
import aiofiles
import asyncio
import base64
from io import BytesIO
from pypdf import PdfReader
import docx2txt
import uuid
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_content):
    pdf_file = BytesIO(pdf_content)
    pdf_reader = PdfReader(pdf_file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text


def extract_text_from_docx(docx_content):
    docx_file = BytesIO(docx_content)
    text = docx2txt.process(docx_file)
    return text


async def store_suggestion(
    request: str, response: list[str], filename: str = "suggestions.jsonl"
):
    """
    Asynchronously store the suggestion request and response in a JSONL file.

    Args:
    request (str): The input text for which suggestions were generated.
    response (list[str]): The list of generated suggestions.
    filename (str): The name of the JSONL file to store the data.
    """
    entry = {
        "timestamp": datetime.now().isoformat(),
        "request": request,
        "response": response,
    }

    async with aiofiles.open(filename, "a") as f:
        await f.write(json.dumps(entry, ensure_ascii=False) + "\n")


async def save_translation_result(md5_hash: str, translation: str):
    """
    Asynchronously save the translation result to a file.

    Args:
    md5_hash (str): The MD5 hash of the original text.
    translation (str): The translated text.
    """
    os.makedirs("translate_result", exist_ok=True)
    filename = os.path.join("translate_result", f"{md5_hash}.txt")
    async with aiofiles.open(filename, "w") as f:
        await f.write(translation)


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 ByzerLLM
llm = byzerllm.ByzerLLM.from_default_model(model="qwen_2_7b_chat")

class SuggestionRequest(BaseModel):
    text: str
    suffixText: str = ""
    context: str = "{}"


class SuggestionResponse(BaseModel):
    suggestions: list[str]


class TranslateRequest(BaseModel):
    text: str
    language: str


class TranslateResponse(BaseModel):
    translation: str


class TranslateResultRequest(BaseModel):
    md5: str


class TranslateResultResponse(BaseModel):
    translation: str


@byzerllm.prompt()
def generate_correction_suggestion(text: str) -> str:
    """
    你是一位精通多语言的语法和表达专家。你的任务是分析用户光标前的一句话，并提供可能的改进建议

    请遵循以下指南：
    1. 仔细分析用户输入最后一句话。
    2. 识别任何语法错误、拼写错误，不自然的表达或可以改进的地方。
    3. 提供1个改进后的内容，该内容需要：
    - 更正语法错误（如有）
    - 使表达更加自然、地道或专业（如适用）
    - 保持原意不变

    用户输入:
    {{ text }}
    请提供改进后的内容，并用<completion></completion>标签封装。
    """


@byzerllm.prompt()
def quick_generate_suggestion(text: str, context: str) -> str:
    """
    你是一位精通多语言的自动续写专家。你的任务是分析用户的当前输入，并预测可能的后续内容。
    补全规则:
    1. 给的续写限50字内。

    对下面内容进行续写：
    {{ text }}"""


@byzerllm.prompt()
def generate_suggestions(text: str, context: str) -> str:
    """
    你是一位精通多语言的自动续写专家。你的任务是分析用户的当前输入，并预测可能的后续内容。
    请用与用户相同的语言提供两个续写，每个续写用<completion></completion>标签封装。

    补全规则:
    1. 给的续写限50字内。
    2. 需要参考输入框的相关信息，猜测用户所处的场景，从而提高补全的准确性。

    当前输入框相关信息：

    ```json
    {{ context }}
    ```

    对下面内容进行续写：
    {{ text }}"""


@byzerllm.prompt()
def generate_suggestions_in_middle(text: str, suffixText: str, context: str) -> str:
    """
    你是一位精通多语言的智能补全专家。根据用户光标前后的内容，预测并补全中间的内容。
    请使用与用户相同的语言提供两个补全，每个建议用<completion></completion>标签封装。

    补全规则:
    1. 给的补全限50字内。
    2. 所有补全都应考虑光标后的内容，确保上下文的连贯性。
    3. 需要参考输入框的相关信息，猜测用户所处的场景，从而提高补全的准确性。

    当前输入框相关信息：

    ```json
    {{ context }}
    ```

    用户光标后的内容:
    {{ suffixText }}

    对下面内容进行续写：
    {{ text }}"""


def extract_suggestions(response: str) -> list[str]:
    suggestions = re.findall(r"<completion>(.*?)</completion>", response, re.DOTALL)
    return [s.strip() for s in suggestions[:3]]


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"Request to {request.url.path} took {process_time:.2f} seconds")
    return response


def visualize_string(s: str) -> str:
    """
    Visualize a string, including invisible characters.
    """
    return repr(s)[1:-1]


@app.post("/v1/llm/suggestion", response_model=SuggestionResponse)
async def get_suggestions(
    request: SuggestionRequest,
    background_tasks: BackgroundTasks,
    x_user_token: Optional[str] = Header(None),
):
    if not x_user_token:
        raise HTTPException(status_code=401, detail="Missing user token")

    # Here you should implement token validation logic
    # For example, check if the token exists in a database
    if not validate_token(x_user_token):
        raise HTTPException(status_code=401, detail="Invalid user token")

    try:
        start_time = time.time()
        if request.suffixText.strip().replace("\u200b", ""):

            quick_suggestion_coro = asyncfy_with_semaphore(
                lambda: quick_generate_suggestion.with_llm(llm).run(
                    text=request.text, context=request.context
                )
            )()

            generate_suggestions_coro = asyncfy_with_semaphore(
                lambda: (
                    generate_suggestions_in_middle.with_llm(llm)
                    .with_extractor(extract_suggestions)
                    .run(
                        text=request.text,
                        suffixText=request.suffixText,
                        context=request.context,
                    )
                )
            )()
            temp1, temp2 = await asyncio.gather(
                quick_suggestion_coro, generate_suggestions_coro
            )
            result = [temp1] + temp2
        else:
            # 创建两个协程
            quick_suggestion_coro = asyncfy_with_semaphore(
                lambda: quick_generate_suggestion.with_llm(llm).run(
                    text=request.text, context=request.context
                )
            )()

            generate_correction_suggestion_coro = asyncfy_with_semaphore(
                lambda: generate_correction_suggestion.with_llm(llm)
                .with_extractor(extract_suggestions)
                .run(text=request.text)
            )()

            generate_suggestions_coro = asyncfy_with_semaphore(
                lambda: (
                    generate_suggestions.with_llm(llm)
                    .with_extractor(extract_suggestions)
                    .run(text=request.text, context=request.context)
                )
            )()

            temp1, temp2 = await asyncio.gather(
                quick_suggestion_coro, generate_suggestions_coro
            )
            result = [temp1] + temp2

        # Schedule the suggestion storage as a background task
        background_tasks.add_task(store_suggestion, request.text, result)

        process_time = time.time() - start_time
        logger.info(
            f"[user:{x_user_token}] content: Suggestion generation for text '...{request.text[-20:]}' took {process_time:.2f} seconds"
        )

        return SuggestionResponse(suggestions=result)
    except Exception as e:
        logger.error(f"Error generating suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def validate_token(token: str) -> bool:
    # Implement your token validation logic here
    # For now, we'll just return True for any non-empty token
    return bool(token)


@byzerllm.prompt()
def translate_text(text: str, language: str) -> str:
    """
    你的目标是对给定的文本进行翻译。请保持原文的意思、语气和风格,同时确保翻译后的文本在目标语言中自然流畅。如果遇到任何歧义或文化特定的表达,请提供备注说明。    
    请将以下文本翻译成{{ language }}：
        
    {{ text }}
    
    """


@app.post("/v1/llm/translate", response_model=TranslateResponse)
async def translate(
    request: TranslateRequest,
    background_tasks: BackgroundTasks,
    x_user_token: Optional[str] = Header(None),
):
    if not x_user_token:
        raise HTTPException(status_code=401, detail="Missing user token")

    if not validate_token(x_user_token):
        raise HTTPException(status_code=401, detail="Invalid user token")
        
    try:
        start_time = time.time()
        
        # Generate a unique identifier
        unique_id = str(uuid.uuid4())

        # Move translation to background task
        background_tasks.add_task(
            translate_and_save, request.text, request.language, unique_id, x_user_token
        )

        process_time = time.time() - start_time
        logger.info(
            f"[user:{x_user_token}] content: Translation request for text '...{request.text[-20:]}' to {request.language} took {process_time:.2f} seconds"
        )

        return TranslateResponse(translation=unique_id)
    except Exception as e:
        logger.error(f"Error processing translation request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/llm/translate/result", response_model=TranslateResultResponse)
async def get_translation_result(
    request: TranslateResultRequest,
    x_user_token: Optional[str] = Header(None),
):
    if not x_user_token:
        raise HTTPException(status_code=401, detail="Missing user token")

    if not validate_token(x_user_token):
        raise HTTPException(status_code=401, detail="Invalid user token")
        
    filename = os.path.join("translate_result", f"{request.md5}.txt")
    if not os.path.exists(filename):
        raise HTTPException(status_code=404, detail="Translation result not found")

    try:
        async with aiofiles.open(filename, "r") as f:
            translation = await f.read()        
        return TranslateResultResponse(translation=translation)
    except Exception as e:
        logger.error(f"Error reading or deleting translation file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing translation result")
    


import concurrent.futures

async def translate_and_save(text: str, language: str, unique_id: str, user_token: str):
    try:
        extracted_text = text

        if text.startswith("data:application/"):
            file_type, base64_data = text.split(",", 1)
            file_type = file_type.split("/")[-1].split(";")[0]

            if file_type not in ["pdf", "docx"]:
                raise ValueError("Unsupported file type")

            file_content = base64.b64decode(base64_data)

            if file_type == "pdf":
                extracted_text = extract_text_from_pdf(file_content)
            else:  # docx
                extracted_text = extract_text_from_docx(file_content)

        logger.info(f"Extracted text size: {len(extracted_text)}")

        MAX_CHUNK_SIZE = 14000
        MAX_WORKERS = 4  # Default number of concurrent workers
        chunks = split_text_into_chunks(extracted_text, MAX_CHUNK_SIZE)
        translated_chunks = [None] * len(chunks)  # Pre-allocate list to maintain order

        async def translate_chunk(i, chunk):
            result = await asyncfy_with_semaphore(
                lambda: translate_text.with_llm(llm)                
                .run(text=chunk, language=language)
            )()
            translated_chunks[i] = result
            logger.info(
                f"[user:{user_token}] content: Translation for chunk {i+1}/{len(chunks)}. input/output:{len(chunk)}/{len(result)} completed"
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = [
                executor.submit(asyncio.run, translate_chunk(i, chunk))
                for i, chunk in enumerate(chunks)
            ]
            concurrent.futures.wait(futures)

        full_translation = "\n".join(translated_chunks)
        await save_translation_result(unique_id, full_translation)

        logger.info(
            f"[user:{user_token}] content: Full translation completed and saved"
        )
    except Exception as e:
        logger.error(f"Error in background translation task: {str(e)}")

def split_text_into_chunks(text: str, max_chunk_size: int) -> List[str]:
    chunks = []
    current_chunk = ""
    for line in text.split('\n'):
        if len(current_chunk) + len(line) + 1 > max_chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""
        current_chunk += line + '\n'
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks


if __name__ == "__main__":
    import uvicorn
    import argparse

    parser = argparse.ArgumentParser(description="Run the FastAPI server with optional SSL configuration")
    parser.add_argument("--ssl-keyfile", help="Path to the SSL key file")
    parser.add_argument("--ssl-certfile", help="Path to the SSL certificate file")
    parser.add_argument("--port", type=int, default=8999, help="Port to run the server on")
    parser.add_argument("--host", default="0.0.0.0", help="Host to run the server on")
    
    args = parser.parse_args()

    ssl_config = {}
    if args.ssl_keyfile and args.ssl_certfile:
        ssl_config["ssl_keyfile"] = args.ssl_keyfile
        ssl_config["ssl_certfile"] = args.ssl_certfile

    uvicorn.run(app, host=args.host, port=args.port, **ssl_config)
