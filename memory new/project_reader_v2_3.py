from pathlib import Path
from ollama import chat
from collections import Counter
import json
import re


# ============================================================
# CONFIG
# ============================================================

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent

MODEL = "gemma4:latest"

MAX_FILE_CHARS = 40000
MAX_SEARCH_RESULTS = 80
MAX_ASK_FILES = 10

MAX_VERIFY_DOCUMENTS = 5
MAX_CLAIMS_PER_DOCUMENT = 12
MAX_CODE_FILES_PER_CLAIM = 8

MAX_EVIDENCE_LINES = 18
MAX_VERIFY_CHARS = 24000

MIN_SCOPE_SCORE = 3
MIN_MISMATCH_SCOPE_SCORE = 5


# ============================================================
# FILE TYPES
# ============================================================

DOCUMENT_EXTENSIONS = {
    ".md",
    ".txt",
}

CODE_EXTENSIONS = {
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".cjs",
    ".mjs",
    ".sql",
    ".css",
}

CONFIG_EXTENSIONS = {
    ".json",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".cfg",
}

ALLOWED_EXTENSIONS = (
    DOCUMENT_EXTENSIONS
    | CODE_EXTENSIONS
    | CONFIG_EXTENSIONS
)


# ============================================================
# IGNORE
# ============================================================

IGNORE_DIRS = {
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    "node_modules",
    ".next",
    "dist",
    "build",
    ".cache",
}

IGNORE_FILES = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "pnpm-lock.yml",
    "npm-shrinkwrap.json",
}

LOCAL_TOOL_PREFIXES = (
    "agent_",
    "project_reader",
)

HISTORICAL_PATTERNS = (
    "memory old",
    "\\archive\\",
    "/archive/",
    "archived",
    "historical",
    "legacy",
    "backup",
    "stale",
    "deprecated",
)

STOP_WORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "for",
    "in",
    "on",
    "with",
    "is",
    "are",
    "be",
    "this",
    "that",
    "project",
    "current",
    "system",

    "ของ",
    "และ",
    "หรือ",
    "ที่",
    "เป็น",
    "มี",
    "อะไร",
    "อย่างไร",
    "ระบบ",
    "โปรเจกต์",
    "ปัจจุบัน",
}


# ============================================================
# PATH
# ============================================================

def safe_path(relative_path: str) -> Path:

    relative_path = (
        relative_path
        .strip()
        .strip('"')
        .strip("'")
    )

    path = (
        PROJECT_ROOT
        / relative_path
    ).resolve()

    if (
        path != PROJECT_ROOT
        and PROJECT_ROOT not in path.parents
    ):
        raise PermissionError(
            f"ไม่อนุญาตให้อ่านนอก Project: {relative_path}"
        )

    return path


# ============================================================
# FILE CLASSIFICATION
# ============================================================

def normalize_path(path: str) -> str:

    return (
        path
        .replace("/", "\\")
        .lower()
    )


def is_historical(path: str) -> bool:

    lower = normalize_path(path)

    return any(
        pattern
        .replace("/", "\\")
        .lower()
        in lower
        for pattern
        in HISTORICAL_PATTERNS
    )


def classify_file(path: str) -> str:

    suffix = (
        Path(path)
        .suffix
        .lower()
    )

    if suffix in DOCUMENT_EXTENSIONS:
        return "DOCUMENT"

    if suffix in CODE_EXTENSIONS:
        return "CODE"

    if suffix in CONFIG_EXTENSIONS:
        return "CONFIG"

    return "OTHER"


def should_ignore(path: Path) -> bool:

    if any(
        part in IGNORE_DIRS
        for part in path.parts
    ):
        return True

    if (
        path.name.lower()
        in IGNORE_FILES
    ):
        return True

    name = (
        path.name.lower()
    )

    if any(
        name.startswith(prefix)
        for prefix
        in LOCAL_TOOL_PREFIXES
    ):
        return True

    return False


# ============================================================
# PROJECT INDEX
# ============================================================

def scan_project() -> list[dict]:

    files = []

    for path in PROJECT_ROOT.rglob("*"):

        if not path.is_file():
            continue

        if should_ignore(path):
            continue

        if (
            path.suffix.lower()
            not in ALLOWED_EXTENSIONS
        ):
            continue

        relative = str(
            path.relative_to(
                PROJECT_ROOT
            )
        )

        try:
            size = path.stat().st_size
        except OSError:
            size = 0

        files.append(
            {
                "path": relative,
                "type": classify_file(relative),
                "historical": is_historical(relative),
                "size": size,
            }
        )

    return sorted(
        files,
        key=lambda item:
        item["path"].lower(),
    )


# ============================================================
# READ FILE
# ============================================================

def read_file(
    relative_path: str,
    max_chars: int = MAX_FILE_CHARS,
) -> str:

    path = safe_path(
        relative_path
    )

    if not path.exists():

        raise FileNotFoundError(
            f"ไม่พบไฟล์: {relative_path}"
        )

    if not path.is_file():

        raise ValueError(
            f"ไม่ใช่ไฟล์: {relative_path}"
        )

    text = path.read_text(
        encoding="utf-8",
        errors="replace",
    )

    if len(text) > max_chars:

        text = (
            text[:max_chars]
            + "\n\n"
            + "[TRUNCATED]"
        )

    return text


# ============================================================
# TOKENIZE
# ============================================================

def tokenize(text: str) -> list[str]:

    raw = re.findall(
        r"[A-Za-z0-9_./\\:\-]+|[\u0E00-\u0E7F]+",
        text.lower(),
    )

    tokens = []

    for token in raw:

        token = token.strip()

        if not token:
            continue

        if token in STOP_WORDS:
            continue

        if len(token) <= 1:
            continue

        tokens.append(
            token
        )

    return list(
        dict.fromkeys(
            tokens
        )
    )


# ============================================================
# SEARCH SCORE
# ============================================================

def score_line(
    query: str,
    tokens: list[str],
    file_path: str,
    line: str,
) -> int:

    query_lower = (
        query.lower().strip()
    )

    line_lower = (
        line.lower()
    )

    path_lower = (
        file_path.lower()
    )

    score = 0

    if (
        query_lower
        and query_lower in line_lower
    ):
        score += 24

    if (
        query_lower
        and query_lower in path_lower
    ):
        score += 30

    hits = 0

    for token in tokens:

        if token in line_lower:

            hits += 1
            score += 4

        if token in path_lower:

            score += 8

    if (
        tokens
        and hits == len(tokens)
    ):
        score += 12

    return score


# ============================================================
# SEARCH PROJECT
# ============================================================

def search_project(
    query: str,
    files: list[dict],
    include_historical: bool = False,
    wanted_types: set[str] | None = None,
) -> list[dict]:

    tokens = tokenize(
        query
    )

    if not tokens:
        return []

    matches = []

    for info in files:

        if (
            info["historical"]
            and not include_historical
        ):
            continue

        if (
            wanted_types
            and info["type"]
            not in wanted_types
        ):
            continue

        try:

            text = read_file(
                info["path"]
            )

        except Exception:

            continue

        for line_no, line in enumerate(
            text.splitlines(),
            start=1,
        ):

            score = score_line(
                query,
                tokens,
                info["path"],
                line,
            )

            if score <= 0:
                continue

            if not info["historical"]:
                score += 5

            snippet = (
                line.strip()
            )

            if len(snippet) > 300:

                snippet = (
                    snippet[:300]
                    + "..."
                )

            matches.append(
                {
                    "file": info["path"],
                    "line": line_no,
                    "score": score,
                    "text": snippet,
                    "type": info["type"],
                    "historical":
                        info["historical"],
                }
            )

    matches.sort(
        key=lambda item: (
            -item["score"],
            item["file"].lower(),
            item["line"],
        )
    )

    return matches[
        :MAX_SEARCH_RESULTS
    ]


# ============================================================
# FILE RANKING
# ============================================================

def rank_files(
    matches: list[dict],
    max_files: int,
) -> list[str]:

    scores = Counter()

    for item in matches:

        if item["historical"]:
            continue

        scores[
            item["file"]
        ] += item["score"]

    ranked = sorted(
        scores.items(),
        key=lambda item:
        item[1],
        reverse=True,
    )

    return [
        file_name
        for file_name, _
        in ranked[:max_files]
    ]


# ============================================================
# JSON HELPER
# ============================================================

def safe_json(
    text: str,
) -> dict:

    text = (
        text or ""
    ).strip()

    try:

        return json.loads(
            text
        )

    except json.JSONDecodeError:

        pass

    match = re.search(
        r"```(?:json)?\s*(\{.*\})\s*```",
        text,
        re.DOTALL,
    )

    if match:

        try:

            return json.loads(
                match.group(1)
            )

        except json.JSONDecodeError:

            pass

    return {}


# ============================================================
# PROJECT SUMMARY
# ============================================================

def project_summary(
    files: list[dict],
) -> str:

    current = sum(
        1
        for item in files
        if not item["historical"]
    )

    historical = (
        len(files)
        - current
    )

    types = Counter(
        item["type"]
        for item in files
    )

    top_dirs = Counter()

    for info in files:

        path = Path(
            info["path"]
        )

        if len(path.parts) > 1:

            top_dirs[
                path.parts[0]
            ] += 1

        else:

            top_dirs[
                "[ROOT]"
            ] += 1

    lines = [
        f"Project Root: {PROJECT_ROOT}",
        f"Total: {len(files)}",
        f"Current: {current}",
        f"Historical/Stale: {historical}",
        "",
        "Types:",
    ]

    for name, count in (
        types.most_common()
    ):

        lines.append(
            f"- {name}: {count}"
        )

    lines.append("")
    lines.append(
        "Top-level:"
    )

    for name, count in (
        top_dirs.most_common()
    ):

        lines.append(
            f"- {name}: {count}"
        )

    return "\n".join(
        lines
    )


# ============================================================
# SEARCH DISPLAY
# ============================================================

def display_search(
    query: str,
    files: list[dict],
) -> str:

    results = search_project(
        query,
        files,
        include_historical=False,
    )

    if not results:

        return (
            "ไม่พบ Current Project Evidence"
        )

    lines = []

    for item in results[:25]:

        lines.append(
            f"[{item['score']}] "
            f"{item['file']}:{item['line']}\n"
            f"    {item['text']}"
        )

    return "\n\n".join(
        lines
    )


# ============================================================
# ASK PROJECT
# ============================================================

def summarize_file(
    file_name: str,
    question: str,
) -> str:

    content = read_file(
        file_name
    )

    prompt = f"""
QUESTION:
{question}

FILE:
{file_name}

TYPE:
{classify_file(file_name)}

--- BEGIN FILE ---

{content}

--- END FILE ---

สกัดเฉพาะข้อมูล
ที่ช่วยตอบ QUESTION

กฎ:
- ใช้เฉพาะไฟล์นี้
- ห้ามเดา
- Document = documentation claim
- Code/Config = implementation evidence
- ไม่เกี่ยวข้องให้ตอบ NOT_RELEVANT
"""

    response = chat(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content":
                    "คุณคือ Project File Reader",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    return (
        response.message.content
        or ""
    )


def ask_project(
    question: str,
    files: list[dict],
) -> str:

    print(
        "\n[SEARCH] Current Project..."
    )

    matches = search_project(
        question,
        files,
        include_historical=False,
    )

    if not matches:

        return (
            "ไม่พบ Current Project Evidence"
        )

    selected = rank_files(
        matches,
        MAX_ASK_FILES,
    )

    print(
        "[FILES]"
    )

    for file_name in selected:

        print(
            f"  - {file_name}"
        )

    evidence_blocks = []

    for file_name in selected:

        print(
            f"[READ] {file_name}"
        )

        try:

            summary = summarize_file(
                file_name,
                question,
            )

        except Exception as e:

            print(
                f"[ERROR] {e}"
            )

            continue

        evidence_blocks.append(
            f"""
SOURCE:
{file_name}

{summary}
"""
        )

    evidence = "\n\n".join(
        evidence_blocks
    )

    prompt = f"""
QUESTION:

{question}

CURRENT PROJECT EVIDENCE:

{evidence}

ตอบคำถามโดยตรง

กฎ:
- ใช้เฉพาะ Evidence
- ห้ามสร้าง Fact
- Code/Config = implementation
- Document = claim
- ถ้ายังยืนยันไม่ได้ให้บอก NOT VERIFIED
- ตอบภาษาไทย
"""

    response = chat(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content":
                    "คุณคือ Local Project Analyst",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    return (
        response.message.content
        or ""
    )


# ============================================================
# CLAIM NORMALIZATION
# ============================================================

def normalize_list(value) -> list[str]:

    if not value:
        return []

    if isinstance(
        value,
        str,
    ):

        value = re.split(
            r"[,;\n]",
            value,
        )

    if not isinstance(
        value,
        list,
    ):

        return []

    return [
        str(item).strip()
        for item in value
        if str(item).strip()
    ]


def normalize_claim(
    raw,
) -> dict | None:

    if isinstance(
        raw,
        str,
    ):

        text = raw.strip()

        if not text:
            return None

        return {
            "claim": text,
            "components": [],
            "references": [],
            "keywords": [],
            "assertions": [
                text
            ],
        }

    if not isinstance(
        raw,
        dict,
    ):

        return None

    claim_text = (
        raw.get("claim")
        or raw.get("description")
        or raw.get("statement")
        or raw.get("text")
    )

    if not claim_text:
        return None

    assertions = normalize_list(
        raw.get("assertions")
        or raw.get("atomic_claims")
    )

    if not assertions:

        assertions = [
            str(
                claim_text
            ).strip()
        ]

    return {
        "claim":
            str(claim_text).strip(),

        "components":
            normalize_list(
                raw.get("components")
                or raw.get("component")
            ),

        "references":
            normalize_list(
                raw.get("code_references")
                or raw.get("references")
            ),

        "keywords":
            normalize_list(
                raw.get("keywords")
            ),

        "assertions":
            assertions,
    }


# ============================================================
# CLAIM EXTRACTION
# ============================================================

def extract_claims(
    document_path: str,
    topic: str,
) -> list[dict]:

    content = read_file(
        document_path
    )

    prompt = f"""
TOPIC:
{topic}

CURRENT DOCUMENT:
{document_path}

--- BEGIN DOCUMENT ---

{content}

--- END DOCUMENT ---

ดึงเฉพาะ Technical Claims
ที่สามารถตรวจสอบกับ Current Code/Config ได้

แต่ละ Claim ต้องแตกเป็น Atomic Assertions

ตอบ JSON:

{{
  "claims": [
    {{
      "claim": "...",
      "components": [],
      "code_references": [],
      "keywords": [],
      "assertions": [
        "atomic assertion 1",
        "atomic assertion 2"
      ]
    }}
  ]
}}

กฎ:
- 1 assertion = 1 เรื่องที่ตรวจได้
- ห้ามรวม A+B+C
- ห้ามเอา roadmap/future target
  มาเป็น implemented fact
"""

    response = chat(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content":
                    "คุณคือ Technical Claim Extractor",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        format="json",
    )

    data = safe_json(
        response.message.content
        or ""
    )

    raw_claims = data.get(
        "claims",
        []
    )

    if not isinstance(
        raw_claims,
        list,
    ):

        return []

    claims = []

    for raw in raw_claims[
        :MAX_CLAIMS_PER_DOCUMENT
    ]:

        item = normalize_claim(
            raw
        )

        if item:

            claims.append(
                item
            )

    return claims


# ============================================================
# DOCUMENT SEARCH
# ============================================================

def find_documents(
    topic: str,
    files: list[dict],
) -> list[str]:

    matches = search_project(
        topic,
        files,
        include_historical=False,
        wanted_types={
            "DOCUMENT",
        },
    )

    return rank_files(
        matches,
        MAX_VERIFY_DOCUMENTS,
    )


# ============================================================
# EXACT FILE LOOKUP
# ============================================================

def exact_file_lookup(
    reference: str,
    files: list[dict],
) -> list[str]:

    ref = normalize_path(
        reference
    ).strip("\\")

    found = []

    for info in files:

        if info["historical"]:
            continue

        if info["type"] not in {
            "CODE",
            "CONFIG",
        }:
            continue

        path = normalize_path(
            info["path"]
        )

        if (
            path == ref
            or path.endswith(
                "\\" + ref
            )
        ):

            found.append(
                info["path"]
            )

    return found


# ============================================================
# FIND CODE
# ============================================================

def find_code(
    claim: dict,
    files: list[dict],
) -> list[str]:

    selected = []

    # exact references first
    for reference in claim[
        "references"
    ]:

        exact = exact_file_lookup(
            reference,
            files,
        )

        for file_name in exact:

            if file_name not in selected:

                selected.append(
                    file_name
                )

    search_terms = []

    search_terms.extend(
        claim["components"]
    )

    search_terms.extend(
        claim["references"]
    )

    search_terms.extend(
        claim["keywords"]
    )

    search_terms.extend(
        claim["assertions"]
    )

    for term in search_terms:

        if (
            not term
            or len(selected)
            >= MAX_CODE_FILES_PER_CLAIM
        ):

            continue

        matches = search_project(
            term,
            files,
            include_historical=False,
            wanted_types={
                "CODE",
                "CONFIG",
            },
        )

        ranked = rank_files(
            matches,
            MAX_CODE_FILES_PER_CLAIM,
        )

        for file_name in ranked:

            if file_name not in selected:

                selected.append(
                    file_name
                )

            if (
                len(selected)
                >= MAX_CODE_FILES_PER_CLAIM
            ):

                break

    return selected[
        :MAX_CODE_FILES_PER_CLAIM
    ]


# ============================================================
# SCOPE SCORE
# ============================================================

def scope_score(
    claim: dict,
    file_name: str,
    content: str,
) -> int:

    path_lower = (
        file_name.lower()
    )

    content_lower = (
        content.lower()
    )

    score = 0

    for component in claim[
        "components"
    ]:

        component_lower = (
            component.lower()
        )

        if (
            component_lower
            in path_lower
        ):
            score += 8

        if (
            component_lower
            in content_lower
        ):
            score += 6

        component_tokens = tokenize(
            component
        )

        if component_tokens:

            hits = sum(
                1
                for token
                in component_tokens
                if (
                    token in path_lower
                    or token in content_lower
                )
            )

            if (
                hits
                == len(component_tokens)
            ):

                score += 5

    for reference in claim[
        "references"
    ]:

        ref = reference.lower()

        if ref in path_lower:
            score += 10

        if ref in content_lower:
            score += 8

    for keyword in claim[
        "keywords"
    ]:

        if (
            keyword.lower()
            in content_lower
        ):

            score += 2

    return score


# ============================================================
# EVIDENCE PACKET
# ============================================================

def evidence_packet(
    claim: dict,
    file_name: str,
) -> dict:

    content = read_file(
        file_name,
        MAX_VERIFY_CHARS,
    )

    score = scope_score(
        claim,
        file_name,
        content,
    )

    tokens = []

    for text in (
        [claim["claim"]]
        + claim["components"]
        + claim["references"]
        + claim["keywords"]
        + claim["assertions"]
    ):

        tokens.extend(
            tokenize(text)
        )

    tokens = list(
        dict.fromkeys(
            tokens
        )
    )

    lines = []

    for line_no, line in enumerate(
        content.splitlines(),
        start=1,
    ):

        lower = (
            line.lower()
        )

        line_score = 0

        for token in tokens:

            if token in lower:

                line_score += 2

        if line_score > 0:

            lines.append(
                (
                    line_score,
                    line_no,
                    line.strip(),
                )
            )

    lines.sort(
        key=lambda item: (
            -item[0],
            item[1],
        )
    )

    snippets = [
        {
            "line": line_no,
            "text": text[:600],
        }
        for _,
        line_no,
        text
        in lines[
            :MAX_EVIDENCE_LINES
        ]
    ]

    return {
        "file": file_name,
        "scope_score": score,
        "snippets": snippets,
    }


# ============================================================
# ASSERTION AUDIT
# ============================================================

def audit_assertions(
    claim: dict,
    packets: list[dict],
) -> dict:

    prompt = f"""
ATOMIC ASSERTIONS:

{json.dumps(
    claim["assertions"],
    ensure_ascii=False,
    indent=2
)}

CURRENT CODE EVIDENCE:

{json.dumps(
    packets,
    ensure_ascii=False,
    indent=2
)}

ตรวจทีละ Assertion

สถานะ:

SUPPORTED
= Current Code ยืนยันโดยตรง

CONTRADICTED
= Current Code ของ component เดียวกัน
  แสดงสิ่งตรงข้ามโดยตรง

NOT_VERIFIED
= Evidence ยังไม่พอ

กฎ:
- ไม่มี Evidence != CONTRADICTED
- คนละ component ห้าม CONTRADICTED
- ต้องใช้ evidence ที่ให้มาเท่านั้น

ตอบ JSON:

{{
  "assertions": [
    {{
      "assertion": "...",
      "status": "SUPPORTED",
      "reason": "..."
    }}
  ]
}}
"""

    response = chat(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content":
                    "คุณคือ Atomic Assertion Auditor",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        format="json",
    )

    data = safe_json(
        response.message.content
        or ""
    )

    raw = data.get(
        "assertions",
        []
    )

    result = []

    allowed = {
        "SUPPORTED",
        "CONTRADICTED",
        "NOT_VERIFIED",
    }

    for index, assertion in enumerate(
        claim["assertions"]
    ):

        item = (
            raw[index]
            if (
                isinstance(
                    raw,
                    list,
                )
                and index < len(raw)
                and isinstance(
                    raw[index],
                    dict,
                )
            )
            else {}
        )

        status = item.get(
            "status",
            "NOT_VERIFIED",
        )

        if status not in allowed:

            status = (
                "NOT_VERIFIED"
            )

        result.append(
            {
                "assertion":
                    assertion,

                "status":
                    status,

                "reason":
                    str(
                        item.get(
                            "reason",
                            "",
                        )
                    ).strip(),
            }
        )

    return {
        "assertions": result,
        "supported": sum(
            item["status"]
            == "SUPPORTED"
            for item in result
        ),
        "contradicted": sum(
            item["status"]
            == "CONTRADICTED"
            for item in result
        ),
        "not_verified": sum(
            item["status"]
            == "NOT_VERIFIED"
            for item in result
        ),
        "total":
            len(result),
    }


# ============================================================
# DERIVE VERDICT
# ============================================================

def derive_verdict(
    audit: dict,
    max_scope: int,
) -> tuple[str, str]:

    total = audit[
        "total"
    ]

    supported = audit[
        "supported"
    ]

    contradicted = audit[
        "contradicted"
    ]

    not_verified = audit[
        "not_verified"
    ]

    if total == 0:

        return (
            "NOT_VERIFIED",
            "LOW",
        )

    # direct contradiction
    if (
        contradicted > 0
        and max_scope
        >= MIN_MISMATCH_SCOPE_SCORE
    ):

        return (
            "MISMATCH",
            "HIGH",
        )

    # MATCH requires complete support
    if (
        supported == total
        and contradicted == 0
        and not_verified == 0
    ):

        return (
            "MATCH",
            "HIGH",
        )

    # some evidence
    if (
        supported > 0
        and contradicted == 0
    ):

        ratio = (
            supported
            / total
        )

        return (
            "PARTIAL_MATCH",
            (
                "HIGH"
                if ratio >= 0.5
                else "MEDIUM"
            ),
        )

    return (
        "NOT_VERIFIED",
        "LOW",
    )


# ============================================================
# VERIFY CLAIM
# ============================================================

def verify_claim(
    document: str,
    claim: dict,
    code_files: list[str],
) -> dict:

    packets = []

    for file_name in code_files:

        try:

            packet = evidence_packet(
                claim,
                file_name,
            )

        except Exception:

            continue

        if (
            packet["scope_score"]
            >= MIN_SCOPE_SCORE
        ):

            packets.append(
                packet
            )

    if not packets:

        return {
            "claim": claim["claim"],
            "document": document,
            "status": "NOT_VERIFIED",
            "confidence": "LOW",
            "reason":
                "ไม่พบ Current Implementation "
                "ที่อยู่ใน scope เดียวกับ Claim",
            "code_sources": [],
            "assertions": [],
        }

    max_scope = max(
        packet["scope_score"]
        for packet in packets
    )

    audit = audit_assertions(
        claim,
        packets,
    )

    status, confidence = derive_verdict(
        audit,
        max_scope,
    )

    reason = (
        f"{audit['supported']} supported, "
        f"{audit['contradicted']} contradicted, "
        f"{audit['not_verified']} not verified"
    )

    return {
        "claim": claim["claim"],
        "document": document,
        "status": status,
        "confidence": confidence,
        "reason": reason,
        "code_sources": [
            packet["file"]
            for packet in packets
        ],
        "assertions":
            audit["assertions"],
    }


# ============================================================
# NORMAL VERIFY
# ============================================================

def verify_docs_vs_code(
    topic: str,
    files: list[dict],
) -> str:

    documents = find_documents(
        topic,
        files,
    )

    if not documents:

        return (
            "ไม่พบ Current Documentation"
        )

    print(
        "[CURRENT DOCUMENTS]"
    )

    for document in documents:

        print(
            f"  - {document}"
        )

    results = []

    for document in documents:

        print()
        print(
            f"[READ DOCUMENT] {document}"
        )

        claims = extract_claims(
            document,
            topic,
        )

        print(
            f"[CLAIMS] {len(claims)}"
        )

        for claim in claims:

            print()
            print(
                f"[CLAIM] {claim['claim']}"
            )

            code_files = find_code(
                claim,
                files,
            )

            result = verify_claim(
                document,
                claim,
                code_files,
            )

            print(
                f"[VERDICT] "
                f"{result['status']}"
            )

            results.append(
                result
            )

    return render_report(
        topic,
        results,
    )


# ============================================================
# ACCEPTANCE TEST CASES
# ============================================================

def build_acceptance_cases() -> list[dict]:

    target_file = (
        r"app\api\quality-gate\feedback\route.ts"
    )

    return [

        # ----------------------------------------------------
        # EXPECTED MATCH
        # ----------------------------------------------------

        {
            "name":
                "MATCH — Quality Gate table",

            "expected":
                "MATCH",

            "document":
                "[ACCEPTANCE TEST]",

            "claim":
            {
                "claim":
                    "Quality Gate feedback API "
                    "updates the quality_gate_log table.",

                "components":
                [
                    "Quality Gate feedback API"
                ],

                "references":
                [
                    target_file,
                    "quality_gate_log",
                ],

                "keywords":
                [
                    "quality_gate_log",
                    "feedback",
                ],

                "assertions":
                [
                    "The Quality Gate feedback API "
                    "uses the quality_gate_log table."
                ],
            },

            "code_files":
                [
                    target_file
                ],
        },

        # ----------------------------------------------------
        # EXPECTED MISMATCH
        # ----------------------------------------------------

        {
            "name":
                "MISMATCH — wrong table",

            "expected":
                "MISMATCH",

            "document":
                "[ACCEPTANCE TEST]",

            "claim":
            {
                "claim":
                    "Quality Gate feedback API "
                    "writes feedback to market_insights "
                    "instead of quality_gate_log.",

                "components":
                [
                    "Quality Gate feedback API"
                ],

                "references":
                [
                    target_file
                ],

                "keywords":
                [
                    "market_insights",
                    "quality_gate_log",
                    "feedback",
                ],

                "assertions":
                [
                    "The Quality Gate feedback API "
                    "writes feedback to market_insights "
                    "instead of quality_gate_log."
                ],
            },

            "code_files":
                [
                    target_file
                ],
        },

        # ----------------------------------------------------
        # EXPECTED NOT VERIFIED
        # ----------------------------------------------------

        {
            "name":
                "NOT_VERIFIED — Redis",

            "expected":
                "NOT_VERIFIED",

            "document":
                "[ACCEPTANCE TEST]",

            "claim":
            {
                "claim":
                    "Quality Gate feedback API "
                    "publishes every feedback event "
                    "to Redis pub/sub.",

                "components":
                [
                    "Quality Gate feedback API"
                ],

                "references":
                [
                    target_file
                ],

                "keywords":
                [
                    "Redis",
                    "pub/sub",
                    "feedback",
                ],

                "assertions":
                [
                    "The Quality Gate feedback API "
                    "publishes feedback to Redis pub/sub."
                ],
            },

            "code_files":
                [
                    target_file
                ],
        },
    ]


# ============================================================
# ACCEPTANCE TEST
# ============================================================

def run_acceptance(
    files: list[dict],
) -> str:

    print()
    print("=" * 72)
    print(
        " ACCEPTANCE TEST"
    )
    print("=" * 72)

    cases = (
        build_acceptance_cases()
    )

    results = []

    indexed_paths = {
        normalize_path(
            item["path"]
        ):
        item["path"]
        for item in files
        if not item["historical"]
    }

    for index, case in enumerate(
        cases,
        start=1,
    ):

        print()
        print(
            f"[TEST {index}] "
            f"{case['name']}"
        )

        resolved_files = []

        for requested in case[
            "code_files"
        ]:

            key = normalize_path(
                requested
            )

            actual = indexed_paths.get(
                key
            )

            if actual:

                resolved_files.append(
                    actual
                )

        if not resolved_files:

            actual_status = (
                "NOT_VERIFIED"
            )

            reason = (
                "Acceptance target file "
                "ไม่พบใน Current Project"
            )

            result = {
                "status":
                    actual_status,
                "confidence":
                    "LOW",
                "reason":
                    reason,
            }

        else:

            result = verify_claim(
                case["document"],
                case["claim"],
                resolved_files,
            )

            actual_status = (
                result["status"]
            )

        expected = (
            case["expected"]
        )

        passed = (
            actual_status
            == expected
        )

        print(
            f"Expected : {expected}"
        )

        print(
            f"Actual   : {actual_status}"
        )

        print(
            "Result   : "
            + (
                "PASS"
                if passed
                else "FAIL"
            )
        )

        if result.get(
            "assertions"
        ):

            print(
                "Assertions:"
            )

            for assertion in result[
                "assertions"
            ]:

                print(
                    f"  - "
                    f"{assertion['status']}: "
                    f"{assertion['assertion']}"
                )

        results.append(
            {
                "name":
                    case["name"],

                "expected":
                    expected,

                "actual":
                    actual_status,

                "passed":
                    passed,
            }
        )

    pass_count = sum(
        item["passed"]
        for item in results
    )

    total = len(
        results
    )

    lines = []

    lines.append("")
    lines.append(
        "=" * 72
    )

    lines.append(
        " ACCEPTANCE SUMMARY"
    )

    lines.append(
        "=" * 72
    )

    for result in results:

        lines.append(
            (
                "PASS"
                if result["passed"]
                else "FAIL"
            )
            + " | "
            + result["name"]
            + " | expected="
            + result["expected"]
            + " actual="
            + result["actual"]
        )

    lines.append("")

    lines.append(
        f"Score: "
        f"{pass_count}/{total}"
    )

    if pass_count == total:

        lines.append("")
        lines.append(
            "ACCEPTANCE STATUS: PASS"
        )

        lines.append(
            "Project Reader Verifier "
            "ผ่านเกณฑ์พื้นฐานสำหรับเริ่มใช้งานจริง"
        )

    else:

        lines.append("")
        lines.append(
            "ACCEPTANCE STATUS: FAIL"
        )

        lines.append(
            "ยังไม่ควรล็อก Verification Engine"
        )

    return "\n".join(
        lines
    )


# ============================================================
# REPORT
# ============================================================

def render_report(
    topic: str,
    results: list[dict],
) -> str:

    groups = {
        "MATCH": [],
        "PARTIAL_MATCH": [],
        "MISMATCH": [],
        "NOT_VERIFIED": [],
    }

    for result in results:

        groups[
            result["status"]
        ].append(
            result
        )

    lines = [
        f"# Verification: {topic}",
        "",
        "## Summary",
        f"- Total: {len(results)}",
        f"- MATCH: {len(groups['MATCH'])}",
        f"- PARTIAL_MATCH: {len(groups['PARTIAL_MATCH'])}",
        f"- MISMATCH: {len(groups['MISMATCH'])}",
        f"- NOT_VERIFIED: {len(groups['NOT_VERIFIED'])}",
    ]

    for status in (
        "MISMATCH",
        "PARTIAL_MATCH",
        "NOT_VERIFIED",
        "MATCH",
    ):

        if not groups[
            status
        ]:

            continue

        lines.append("")
        lines.append(
            f"## {status}"
        )

        for result in groups[
            status
        ]:

            lines.append("")
            lines.append(
                f"### {result['claim']}"
            )

            lines.append(
                f"- Document: "
                f"`{result['document']}`"
            )

            lines.append(
                f"- Verdict: "
                f"**{result['status']}**"
            )

            lines.append(
                f"- Confidence: "
                f"**{result['confidence']}**"
            )

            lines.append(
                f"- Reason: "
                f"{result['reason']}"
            )

            if result[
                "assertions"
            ]:

                lines.append(
                    "- Assertions:"
                )

                for assertion in result[
                    "assertions"
                ]:

                    lines.append(
                        f"  - "
                        f"{assertion['status']}: "
                        f"{assertion['assertion']}"
                    )

            if result[
                "code_sources"
            ]:

                lines.append(
                    "- Code:"
                )

                for source in result[
                    "code_sources"
                ]:

                    lines.append(
                        f"  - `{source}`"
                    )

    return "\n".join(
        lines
    )


# ============================================================
# HELP
# ============================================================

HELP_TEXT = """
คำสั่ง

scan
    ดู Project

search <คำค้น>
    ค้น Current Project

file <path>
    อ่านไฟล์โดยตรง

ask <คำถาม>
    ให้ Ollama อ่านเอกสาร/โค้ดแล้วตอบ

verify <หัวข้อ>
    ตรวจ Documentation กับ Current Code

acceptance
    รัน Acceptance Test ขั้นสุดท้าย

help
    ดูคำสั่ง

exit
    ออก


ตัวอย่าง

search quality_gate_log

file app\\api\\quality-gate\\feedback\\route.ts

ask Quality Gate เชื่อมกับ Supabase อย่างไร

verify Quality Gate feedback

acceptance
"""


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 72)
    print(
        " LOCAL OLLAMA PROJECT READER V2.3"
    )
    print("=" * 72)

    print(
        f"Model : {MODEL}"
    )

    print(
        f"Root  : {PROJECT_ROOT}"
    )

    print(
        "Mode  : READ-ONLY"
    )

    print()

    print(
        "Goals:"
    )

    print(
        "- Read project documents"
    )

    print(
        "- Read source code"
    )

    print(
        "- Ask from Current Project"
    )

    print(
        "- Verify Documentation vs Code"
    )

    print(
        "- Controlled Acceptance Test"
    )

    print()

    print(
        "Rules:"
    )

    print(
        "- MATCH requires complete support"
    )

    print(
        "- MISMATCH requires direct contradiction"
    )

    print(
        "- NO EVIDENCE != MISMATCH"
    )

    print("=" * 72)

    print()
    print(
        "[SCAN] สร้าง Project Index..."
    )

    files = scan_project()

    current = sum(
        1
        for item in files
        if not item["historical"]
    )

    historical = (
        len(files)
        - current
    )

    print(
        f"[OK] "
        f"Total={len(files)} "
        f"Current={current} "
        f"Historical={historical}"
    )

    print(
        "\nพิมพ์ help เพื่อดูคำสั่ง"
    )

    while True:

        try:

            command = input(
                "\nคุณ > "
            ).strip()

        except KeyboardInterrupt:

            print(
                "\n\nปิด Project Reader"
            )

            break

        except EOFError:

            break

        if not command:
            continue

        lower = (
            command.lower()
        )

        # ----------------------------------------------------
        # EXIT
        # ----------------------------------------------------

        if lower in {
            "exit",
            "quit",
        }:

            print(
                "\nปิด Project Reader V2.3"
            )

            break

        # ----------------------------------------------------
        # HELP
        # ----------------------------------------------------

        if lower == "help":

            print(
                HELP_TEXT
            )

            continue

        # ----------------------------------------------------
        # SCAN
        # ----------------------------------------------------

        if lower == "scan":

            print()
            print(
                project_summary(
                    files
                )
            )

            continue

        # ----------------------------------------------------
        # ACCEPTANCE
        # ----------------------------------------------------

        if lower == "acceptance":

            result = run_acceptance(
                files
            )

            print(
                result
            )

            continue

        # ----------------------------------------------------
        # SEARCH
        # ----------------------------------------------------

        if lower == "search":

            print(
                "\nกรุณาระบุคำค้น เช่น:"
            )

            print(
                "search quality_gate_log"
            )

            continue

        if lower.startswith(
            "search "
        ):

            query = command[
                len("search "):
            ].strip()

            print()
            print(
                display_search(
                    query,
                    files,
                )
            )

            continue

        # ----------------------------------------------------
        # FILE
        # ----------------------------------------------------

        if lower == "file":

            print(
                "\nกรุณาระบุ path"
            )

            continue

        if lower.startswith(
            "file "
        ):

            file_name = command[
                len("file "):
            ].strip()

            try:

                print()
                print(
                    read_file(
                        file_name
                    )
                )

            except Exception as e:

                print(
                    f"[ERROR] {e}"
                )

            continue

        # ----------------------------------------------------
        # ASK
        # ----------------------------------------------------

        if lower == "ask":

            print(
                "\nกรุณาระบุคำถาม"
            )

            continue

        if lower.startswith(
            "ask "
        ):

            question = command[
                len("ask "):
            ].strip()

            answer = ask_project(
                question,
                files,
            )

            print()
            print("=" * 72)
            print(
                " OLLAMA PROJECT ANSWER"
            )
            print("=" * 72)
            print()
            print(
                answer
            )

            continue

        # ----------------------------------------------------
        # VERIFY
        # ----------------------------------------------------

        if lower == "verify":

            print(
                "\nกรุณาระบุหัวข้อ เช่น:"
            )

            print(
                "verify Quality Gate feedback"
            )

            continue

        if lower.startswith(
            "verify "
        ):

            topic = command[
                len("verify "):
            ].strip()

            print()
            print(
                f"[VERIFY] {topic}"
            )

            result = verify_docs_vs_code(
                topic,
                files,
            )

            print()
            print("=" * 72)
            print(
                " DOCUMENT vs CURRENT CODE"
            )
            print("=" * 72)
            print()
            print(
                result
            )

            continue

        # ----------------------------------------------------
        # DEFAULT = ASK
        # ----------------------------------------------------

        answer = ask_project(
            command,
            files,
        )

        print()
        print("=" * 72)
        print(
            " OLLAMA PROJECT ANSWER"
        )
        print("=" * 72)
        print()
        print(
            answer
        )


# ============================================================
# START
# ============================================================

if __name__ == "__main__":
    main()