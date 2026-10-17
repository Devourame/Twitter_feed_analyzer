"""One-time helper: download the Cardiff NLP Twitter-RoBERTa sentiment model
into models/twitter-roberta-base-sentiment. Run only when setting up or
refreshing the local model; inference itself never uses the network.

Run:  .venv\\Scripts\\python.exe download_model.py
"""

from huggingface_hub import snapshot_download

TARGET = "../models/twitter-roberta-base-sentiment"

path = snapshot_download(
    repo_id="cardiffnlp/twitter-roberta-base-sentiment",
    local_dir=TARGET,
    allow_patterns=[
        "config.json",
        "pytorch_model.bin",
        "vocab.json",
        "merges.txt",
        "sentencepiece.bpe.model",
        "tokenizer.json",
        "special_tokens_map.json",
        "tokenizer_config.json",
        "vocab.txt",
    ],
)
print(f"Model downloaded to: {path}")
