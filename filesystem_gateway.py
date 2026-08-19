from pathlib import Path
import json
import re
import time
import requests


# ============================================================
# AP-HOME OS — READ-ONLY AI ARCHITECTURE GATEWAY
# ============================================================

ROOT = Path(
    r"D:\ARCHI\01_PROJECTS\CORE\ap-home-platform"
).resolve()

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "gemma4:12b"

# ------------------------------------------------------------
# Runtime limits
# ------------------------------------------------------------

REQUEST_TIMEOUT = 180

MAX_FILE_CHARS = 120_000

# Maximum amount of code sent to Gemma in one audit batch.
MAX_CODE_CHARS_PER_BATCH = 7_000

# Maximum architecture text sent with one batch.
MAX_ARCH_CHARS_PER_BATCH = 6_000

# Keep output reasonably small.
NUM_PREDICT_READ = 512
NUM_PREDICT_AUDIT = 500


# ============================================================
# FILESYSTEM SECURITY
# ============================================================

def safe_path(path: str) -> Path:
    """
    Resolve a path and ensure it remains inside the repository.
    """

    target = Path(path)

    if not target.is_absolute():
        target = ROOT / target

    target = target.resolve()

    try:
        target.relative_to(ROOT)
    except ValueError:
        raise PermissionError(
            f"Access denied: path is outside repository: {target}"
        )

    return target


def read_file(path: str) -> str:
    """
    Read one UTF-8 text file.
    READ ONLY.
    """

    target = safe_path(path)

    if not target.is_file():
        raise FileNotFoundError(
            f"File not found: {target}"
        )

    text = target.read_text(
        encoding="utf-8",
        errors="replace"
    )

    if len(text) > MAX_FILE_CHARS:
        text = (
            text[:MAX_FILE_CHARS]
            + "\n\n[WARNING: FILE CONTENT TRUNCATED]"
        )

    return text


# ============================================================
# DOCUMENT DISCOVERY
# ============================================================

EXCLUDED_DIRS = {
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    "coverage",
    "venv",
    ".venv",
}


DOCUMENT_EXTENSIONS = {
    ".md",
    ".mdx",
    ".txt",
    ".yaml",
    ".yml",
}


CODE_EXTENSIONS = {
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".cjs",
    ".mjs",
}


def is_excluded(path: Path) -> bool:
    return any(
        part in EXCLUDED_DIRS
        for part in path.parts
    )


def list_documents() -> list[str]:
    results = []

    for path in ROOT.rglob("*"):

        if not path.is_file():
            continue

        if is_excluded(path):
            continue

        if path.suffix.lower() not in DOCUMENT_EXTENSIONS:
            continue

        try:
            relative = path.relative_to(ROOT)
        except ValueError:
            continue

        results.append(str(relative))

    return sorted(results)


def list_code_files() -> list[str]:
    results = []

    for path in ROOT.rglob("*"):

        if not path.is_file():
            continue

        if is_excluded(path):
            continue

        if path.suffix.lower() not in CODE_EXTENSIONS:
            continue

        try:
            relative = path.relative_to(ROOT)
        except ValueError:
            continue

        results.append(str(relative))

    return sorted(results)


def find_documents(keyword: str) -> list[str]:
    keyword = keyword.lower().strip()

    return [
        document
        for document in list_documents()
        if keyword in document.lower()
    ]


# ============================================================
# OLLAMA
# ============================================================

SYSTEM_PROMPT = """
คุณคือ AP-Home OS Read-Only Architecture Analyst

Repository:

D:\\ARCHI\\01_PROJECTS\\CORE\\ap-home-platform

กฎ:

1. ใช้เฉพาะข้อมูลที่ส่งให้ใน prompt
2. ห้ามเติมข้อมูลจากความรู้ทั่วไป
3. ห้ามเดา
4. ห้ามแก้ไขไฟล์
5. ห้ามสร้างไฟล์
6. ห้ามลบไฟล์
7. หากหลักฐานไม่พอ ให้ตอบ NOT ENOUGH EVIDENCE
8. เมื่อเปรียบเทียบ Architecture กับ Code:
   - CONFLICT = Code ขัดกับสิ่งที่ Architecture ระบุอย่างชัดเจน
   - CONSISTENT = Code สอดคล้องกับ Architecture จากหลักฐานที่มี
   - NOT ENOUGH EVIDENCE = หลักฐานไม่พอที่จะตัดสิน
9. อย่าถือว่า "ไม่พบข้อมูล" เป็น conflict
10. ต้องแยก Architecture evidence และ Code evidence
11. ห้ามสร้างไฟล์หรือแก้ระบบ
12. ตอบเฉพาะผลการวิเคราะห์ที่มีหลักฐานรองรับ

คุณกำลังทำ READ-ONLY AUDIT
"""


def ollama_chat(
    prompt: str,
    num_predict: int = NUM_PREDICT_AUDIT,
    label: str = "Ollama"
) -> str:

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "stream": False,
        "think": False,
        "options": {
            "num_predict": num_predict,
        },
    }

    started = time.time()

    print(
        f"[OLLAMA] {label}...",
        flush=True
    )

    response = requests.post(
        OLLAMA_URL,
        json=payload,
        timeout=REQUEST_TIMEOUT,
    )

    elapsed = time.time() - started

    response.raise_for_status()

    data = response.json()

    message = data.get("message", {})

    answer = message.get("content", "")

    print(
        f"[OLLAMA] {label}: "
        f"{elapsed:.1f}s | "
        f"{len(answer):,} output chars",
        flush=True,
    )

    return answer


# ============================================================
# ARCHITECTURE SECTION PARSER
# ============================================================

def extract_architecture_sections(text: str) -> list[dict]:
    """
    Parse markdown headings and their following content.
    """

    lines = text.splitlines()

    sections = []

    current_title = None
    current_level = None
    current_lines = []

    heading_pattern = re.compile(
        r"^(#{1,6})\s+(.+?)\s*$"
    )

    def flush():

        nonlocal current_title
        nonlocal current_level
        nonlocal current_lines

        if current_title is None:
            return

        content = "\n".join(
            current_lines
        ).strip()

        sections.append(
            {
                "title": current_title,
                "level": current_level,
                "content": content,
            }
        )

        current_title = None
        current_level = None
        current_lines = []

    for line in lines:

        match = heading_pattern.match(line)

        if match:

            flush()

            current_level = len(
                match.group(1)
            )

            current_title = match.group(2).strip()

            continue

        if current_title is not None:
            current_lines.append(line)

    flush()

    return sections


# ============================================================
# CODE FILE SELECTION
# ============================================================

CODE_GROUPS = {
    "Dashboard": [
        "app/",
        "components/",
    ],

    "Vercel API Routes": [
        "app/api/",
        "app/webhook/",
    ],

    "Backend Hub": [
        "services/backend-hub/",
    ],

    "FB Backend": [
        "services/fb-backend/",
    ],

    "n8n": [
        "app/api/n8n/",
        "app/webhook/n8n/",
        "services/backend-hub/src/infrastructure/n8n/",
        "services/backend-hub/src/modules/blog/",
    ],

    "Supabase": [
        "lib/supabase.ts",
        "services/backend-hub/src/infrastructure/supabase/",
        "supabase/",
    ],

    "Intelligence": [
        "app/api/market-intel/",
        "app/market-intel/",
        "components/MarketIntel.tsx",
        "services/backend-hub/src/modules/",
    ],

    "Deployment": [
        "vercel.json",
        "package.json",
        "services/backend-hub/package.json",
        "services/fb-backend/package.json",
        ".github/",
    ],

    "Module System": [
        "app/",
        "components/",
        "services/backend-hub/src/",
    ],

    "Migration": [
        "app/",
        "components/",
        "services/",
        "supabase/",
        "vercel.json",
        "package.json",
    ],
}


def group_for_section(title: str) -> str | None:

    title_lower = title.lower()

    if "dashboard" in title_lower:
        return "Dashboard"

    if "vercel api" in title_lower:
        return "Vercel API Routes"

    if "backend hub" in title_lower:
        return "Backend Hub"

    if "fb backend" in title_lower:
        return "FB Backend"

    if "n8n" in title_lower:
        return "n8n"

    if "supabase" in title_lower:
        return "Supabase"

    if "intelligence" in title_lower:
        return "Intelligence"

    if "database" in title_lower:
        return "Supabase"

    if "deployment" in title_lower:
        return "Deployment"

    if "module" in title_lower:
        return "Module System"

    if "migration" in title_lower:
        return "Migration"

    return None


def select_code_files(
    group_name: str
) -> list[str]:

    prefixes = CODE_GROUPS.get(
        group_name,
        []
    )

    if not prefixes:
        return []

    all_files = list_code_files()

    selected = []

    for file in all_files:

        normalized = file.replace(
            "\\",
            "/"
        )

        for prefix in prefixes:

            normalized_prefix = prefix.replace(
                "\\",
                "/"
            )

            if normalized == normalized_prefix:
                selected.append(file)
                break

            if normalized.startswith(
                normalized_prefix
            ):
                selected.append(file)
                break

    return sorted(
        set(selected)
    )


# ============================================================
# CODE CONTEXT BUILDER
# ============================================================

def build_code_context(
    files: list[str],
    max_chars: int = MAX_CODE_CHARS_PER_BATCH
) -> tuple[str, list[str]]:

    chunks = []
    used_files = []

    total = 0

    for file in files:

        try:
            content = read_file(file)
        except Exception as exc:
            chunks.append(
                f"\n--- {file} ---\n"
                f"[ERROR READING FILE: {exc}]\n"
            )
            continue

        remaining = max_chars - total

        if remaining <= 0:
            break

        if len(content) > remaining:

            content = (
                content[:remaining]
                + "\n[CODE TRUNCATED FOR THIS BATCH]"
            )

        block = (
            f"\n--- FILE: {file} ---\n"
            f"{content}\n"
        )

        chunks.append(block)

        used_files.append(file)

        total += len(block)

        if total >= max_chars:
            break

    return (
        "\n".join(chunks),
        used_files
    )


# ============================================================
# ARCHITECTURE CONTEXT BUILDER
# ============================================================

def build_architecture_context(
    sections: list[dict],
    max_chars: int = MAX_ARCH_CHARS_PER_BATCH
) -> str:

    chunks = []
    total = 0

    for section in sections:

        title = section["title"]
        content = section["content"]

        if not content:
            continue

        block = (
            f"\n--- ARCHITECTURE SECTION: "
            f"{title} ---\n"
            f"{content}\n"
        )

        remaining = max_chars - total

        if remaining <= 0:
            break

        if len(block) > remaining:

            block = (
                block[:remaining]
                + "\n[ARCHITECTURE SECTION TRUNCATED]"
            )

        chunks.append(block)

        total += len(block)

    return "\n".join(chunks)


# ============================================================
# AUDIT PROMPT
# ============================================================

def build_audit_prompt(
    group_name: str,
    architecture_context: str,
    code_context: str
) -> str:

    return f"""
ตรวจสอบความสอดคล้องระหว่าง Architecture กับ Code
สำหรับ domain:

{group_name}

ห้ามวิเคราะห์ส่วนอื่นที่ไม่มีหลักฐาน

================ ARCHITECTURE ================

{architecture_context}

================ CODE ================

{code_context}

================================================

ตอบตามรูปแบบนี้เท่านั้น:

## {group_name}

### CONFLICT
ถ้ามี:
- Architecture:
- Code:
- File:
- Reason:

ถ้าไม่มี:
None

### CONSISTENT
รายการที่เห็นว่าสอดคล้อง:
- ...

ถ้าไม่มี:
None

### NOT ENOUGH EVIDENCE
รายการที่หลักฐานไม่พอ:
- ...

ถ้าไม่มี:
None

กฎสำคัญ:

- อย่าถือว่า implementation ที่หาไม่เจอเป็น conflict
- อย่าเดา behavior ของ code
- ใช้เฉพาะ code ที่แสดงให้
- ถ้า Architecture ระบุสิ่งหนึ่ง แต่ code แสดงอีกสิ่งหนึ่งอย่างชัดเจน จึงค่อยรายงาน CONFLICT
"""


# ============================================================
# CODE ↔ ARCHITECTURE AUDIT
# ============================================================

def run_code_architecture_audit():

    architecture_path = (
        ROOT / "ARCHITECTURE_V2.md"
    )

    if not architecture_path.is_file():

        print(
            "ERROR: ARCHITECTURE_V2.md not found"
        )

        return

    print()
    print("=" * 60)
    print("AP-HOME OS — CODE / ARCHITECTURE AUDIT")
    print("=" * 60)
    print()
    print(
        f"Architecture: {architecture_path}"
    )
    print()

    architecture_text = read_file(
        "ARCHITECTURE_V2.md"
    )

    print(
        f"[ARCH] {len(architecture_text):,} chars"
    )

    sections = extract_architecture_sections(
        architecture_text
    )

    print(
        f"[ARCH] {len(sections)} sections found"
    )

    # --------------------------------------------------------
    # Select only architecture sections that map to actual code
    # --------------------------------------------------------

    audit_sections = []

    for section in sections:

        group = group_for_section(
            section["title"]
        )

        if not group:
            continue

        audit_sections.append(
            (
                group,
                section
            )
        )

    # --------------------------------------------------------
    # Group sections
    # --------------------------------------------------------

    grouped = {}

    for group, section in audit_sections:

        grouped.setdefault(
            group,
            []
        ).append(section)

    print(
        f"[AUDIT] {len(grouped)} code domains selected"
    )

    print()

    results = []

    # --------------------------------------------------------
    # Process one domain at a time
    # --------------------------------------------------------

    for index, (
        group_name,
        group_sections
    ) in enumerate(
        grouped.items(),
        start=1
    ):

        print(
            f"[AUDIT] Domain {index}/{len(grouped)}: "
            f"{group_name}"
        )

        # ----------------------------------------------------
        # Architecture context
        # ----------------------------------------------------

        architecture_context = (
            build_architecture_context(
                group_sections
            )
        )

        print(
            f"[ARCH] {len(architecture_context):,} chars"
        )

        # ----------------------------------------------------
        # Relevant code files
        # ----------------------------------------------------

        files = select_code_files(
            group_name
        )

        print(
            f"[CODE] Candidate files: "
            f"{len(files)}"
        )

        if not files:

            results.append(
                f"""
## {group_name}

### CONFLICT
None

### CONSISTENT
None

### NOT ENOUGH EVIDENCE
- No relevant code files were found for this domain.
"""
            )

            continue

        # ----------------------------------------------------
        # Split code into batches if necessary
        # ----------------------------------------------------

        remaining_files = list(files)

        batch_number = 0

        while remaining_files:

            batch_number += 1

            code_context, used_files = (
                build_code_context(
                    remaining_files
                )
            )

            if not used_files:
                break

            print(
                f"[CODE] Batch {batch_number}: "
                f"{len(used_files)} files / "
                f"{len(code_context):,} chars"
            )

            prompt = build_audit_prompt(
                group_name,
                architecture_context,
                code_context
            )

            try:

                answer = ollama_chat(
                    prompt,
                    num_predict=NUM_PREDICT_AUDIT,
                    label=(
                        f"{group_name} "
                        f"batch {batch_number}"
                    )
                )

                results.append(
                    answer
                )

            except requests.exceptions.Timeout:

                results.append(
                    f"""
## {group_name}

### CONFLICT
Not evaluated because Ollama timed out.

### CONSISTENT
None

### NOT ENOUGH EVIDENCE
- Analysis timed out while processing:
  {", ".join(used_files)}
"""
                )

                print(
                    "[AUDIT] Timeout; "
                    "continuing with next domain."
                )

            except requests.exceptions.RequestException as exc:

                results.append(
                    f"""
## {group_name}

### CONFLICT
Not evaluated because Ollama connection failed.

### CONSISTENT
None

### NOT ENOUGH EVIDENCE
- Ollama error: {exc}
"""
                )

                print(
                    f"[AUDIT] Ollama error: {exc}"
                )

            except Exception as exc:

                results.append(
                    f"""
## {group_name}

### CONFLICT
Not evaluated.

### CONSISTENT
None

### NOT ENOUGH EVIDENCE
- Error: {exc}
"""
                )

                print(
                    f"[AUDIT] Error: {exc}"
                )

            # ------------------------------------------------
            # Remove files that were processed
            # ------------------------------------------------

            remaining_files = [
                file
                for file in remaining_files
                if file not in used_files
            ]

    # --------------------------------------------------------
    # Final report
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("AUDIT RESULT")
    print("=" * 60)
    print()

    for result in results:

        print(result)
        print()
        print("-" * 60)
        print()

    print(
        "AUDIT COMPLETE"
    )


# ============================================================
# SIMPLE DOCUMENT READING
# ============================================================

def run_read_command(
    question: str
):

    print()
    print(
        "[MODE] DOCUMENT READING"
    )

    # --------------------------------------------------------
    # Find explicitly mentioned file
    # --------------------------------------------------------

    candidates = []

    for document in list_documents():

        name = Path(document).name.lower()

        if name in question.lower():
            candidates.append(
                document
            )

    if not candidates:

        # Try common architecture/document names.
        known = [
            "README.md",
            "ARCHITECTURE_V2.md",
        ]

        for name in known:

            if name.lower() in question.lower():

                if (
                    ROOT / name
                ).is_file():

                    candidates.append(
                        name
                    )

    if not candidates:

        print(
            "ไม่พบชื่อไฟล์ที่ระบุในคำสั่ง"
        )

        print()
        print(
            "ตัวอย่าง:"
        )

        print(
            "  อ่าน README.md แล้วสรุป"
        )

        print(
            "  อ่าน ARCHITECTURE_V2.md แล้วสรุป"
        )

        return

    # --------------------------------------------------------
    # Read one file at a time
    # --------------------------------------------------------

    for path in candidates:

        try:

            content = read_file(path)

        except Exception as exc:

            print(
                f"ERROR: {exc}"
            )

            continue

        print(
            f"[READ] {path}"
        )

        print(
            f"[READ] {len(content):,} chars"
        )

        prompt = f"""
อ่านเอกสารต่อไปนี้และตอบคำถามของผู้ใช้

คำถาม:
{question}

กฎ:
- ใช้เฉพาะเอกสารนี้
- ห้ามเติมข้อมูลจากความรู้ทั่วไป
- หากไม่พบข้อมูล ให้บอกว่าไม่พบข้อมูลในเอกสาร
- แยกข้อเท็จจริงกับข้อสรุป
- ไม่ต้องอธิบายขั้นตอนการทำงานของ AI

เอกสาร:
--- {path} ---

{content}
"""

        try:

            answer = ollama_chat(
                prompt,
                num_predict=NUM_PREDICT_READ,
                label=f"reading {path}"
            )

            print()
            print(answer)
            print()

        except requests.exceptions.Timeout:

            print()
            print(
                f"ERROR: Ollama timeout while reading {path}"
            )
            print()

        except Exception as exc:

            print()
            print(
                f"ERROR: {exc}"
            )
            print()


# ============================================================
# ARCHITECTURE RELATIONSHIP MODE
# ============================================================

def run_architecture_relationship():

    architecture_path = (
        ROOT / "ARCHITECTURE_V2.md"
    )

    if not architecture_path.is_file():

        print(
            "ERROR: ARCHITECTURE_V2.md not found"
        )

        return

    content = read_file(
        "ARCHITECTURE_V2.md"
    )

    print()
    print(
        "[MODE] ARCHITECTURE RELATIONSHIP"
    )

    print(
        f"[READ] ARCHITECTURE_V2.md: "
        f"{len(content):,} chars"
    )

    prompt = f"""
อ่าน ARCHITECTURE_V2.md ต่อไปนี้

งาน:
อธิบายความสัมพันธ์ของแต่ละ service ใน architecture

ต้องตอบเฉพาะจากเอกสาร

ต้องแยก:
1. Service
2. Responsibility
3. Service ที่เรียกใช้
4. Service ที่ถูกเรียก
5. Data flow
6. จุดที่เอกสารระบุชัด
7. จุดที่เอกสารไม่ได้ระบุ

ห้ามเติม architecture จากความรู้ทั่วไป

เอกสาร:

{content}
"""

    try:

        answer = ollama_chat(
            prompt,
            num_predict=NUM_PREDICT_READ,
            label="architecture relationship"
        )

        print()
        print(answer)
        print()

    except requests.exceptions.Timeout:

        print(
            "ERROR: Ollama timeout."
        )

    except Exception as exc:

        print(
            f"ERROR: {exc}"
        )


# ============================================================
# COMMAND ROUTER
# ============================================================

def is_code_architecture_audit(
    question: str
) -> bool:

    q = question.lower()

    code_words = [
        "code",
        "โค้ด",
        "source",
        "implementation",
    ]

    architecture_words = [
        "architecture_v2",
        "architecture v2",
        "architecture",
        "สถาปัตยกรรม",
    ]

    conflict_words = [
        "ขัดแย้ง",
        "ความขัดแย้ง",
        "conflict",
        "ตรวจ",
        "เปรียบเทียบ",
        "compare",
        "audit",
    ]

    return (
        any(word in q for word in code_words)
        and
        any(word in q for word in architecture_words)
        and
        any(word in q for word in conflict_words)
    )


def is_architecture_relationship(
    question: str
) -> bool:

    q = question.lower()

    relationship_words = [
        "ความสัมพันธ์",
        "relationship",
        "สัมพันธ์",
        "service",
        "services",
    ]

    architecture_words = [
        "architecture",
        "สถาปัตยกรรม",
    ]

    return (
        any(
            word in q
            for word in relationship_words
        )
        and
        any(
            word in q
            for word in architecture_words
        )
    )


# ============================================================
# CLI
# ============================================================

def main():

    print()
    print("=" * 60)
    print("AP-HOME OS — READ-ONLY AI")
    print("=" * 60)
    print(
        f"Model : {MODEL}"
    )
    print(
        f"Root  : {ROOT}"
    )
    print()
    print(
        "Read-only mode."
    )
    print(
        "No file modification tools are available."
    )
    print()
    print("Supported:")
    print()
    print(
        "  อ่าน README.md แล้วสรุป"
    )
    print()
    print(
        "  อ่าน architecture document "
        "แล้วบอกความสัมพันธ์ของแต่ละ service"
    )
    print()
    print(
        "  ตรวจความขัดแย้งระหว่าง Code "
        "กับ ARCHITECTURE_V2.md"
    )
    print()
    print(
        "  ตรวจความขัดแย้งระหว่าง README.md "
        "กับ ARCHITECTURE_V2.md"
    )
    print()
    print(
        "Commands: exit / quit"
    )
    print("=" * 60)
    print()

    while True:

        try:

            question = input(
                "> "
            ).strip()

        except (
            EOFError,
            KeyboardInterrupt
        ):

            print()
            print("Bye.")
            break

        if not question:
            continue

        if question.lower() in {
            "exit",
            "quit",
        }:

            print("Bye.")
            break

        # ----------------------------------------------------
        # Code ↔ Architecture
        # ----------------------------------------------------

        if is_code_architecture_audit(
            question
        ):

            run_code_architecture_audit()
            continue

        # ----------------------------------------------------
        # Architecture relationships
        # ----------------------------------------------------

        if is_architecture_relationship(
            question
        ):

            run_architecture_relationship()
            continue

        # ----------------------------------------------------
        # Normal document reading
        # ----------------------------------------------------

        run_read_command(
            question
        )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()