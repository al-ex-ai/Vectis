from pydantic import BaseModel


class PreviewResponse(BaseModel):
    success: bool = True
    table: str = ""
    columns: list[str] = []
    rows: list[dict[str, object]] = []
    total: int = 0
    page: int = 1
    page_size: int = 50
    total_pages: int = 1
