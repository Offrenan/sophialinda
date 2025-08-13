# app.py
import os
import json
import uuid
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # libera requisições do frontend (se frontend rodar de outra origem)

# Pasta onde serão salvos os transcripts
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRANS_DIR = os.path.join(BASE_DIR, "transcripts")
os.makedirs(TRANS_DIR, exist_ok=True)

@app.route("/api/complete_week", methods=["POST"])
def complete_week():
    """
    Recebe JSON com a chave 'transcript', grava em arquivo JSON e retorna URL de download.
    Payload esperado:
    { "transcript": { ... } }
    """
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "JSON inválido"}), 400

    transcript = data.get("transcript")
    if not transcript:
        return jsonify({"error": "campo 'transcript' ausente"}), 400

    # nome de arquivo seguro com timestamp + uuid
    ts = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    filename = f"transcript_{ts}_{uuid.uuid4().hex[:8]}.json"
    filepath = os.path.join(TRANS_DIR, filename)

    # salva o transcript em UTF-8, formatado
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(transcript, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return jsonify({"error": "falha ao gravar arquivo", "detail": str(e)}), 500

    download_url = f"/download/{filename}"
    return jsonify({"ok": True, "download_url": download_url}), 200


@app.route("/download/<path:filename>", methods=["GET"])
def download_file(filename):
    """
    Serve o arquivo salvo com Content-Disposition para forçar download.
    """
    try:
        return send_from_directory(TRANS_DIR, filename, as_attachment=True)
    except Exception:
        return jsonify({"error": "arquivo não encontrado"}), 404


if __name__ == "__main__":
    # porta 5000 por padrão
    app.run(host="0.0.0.0", port=5000, debug=True)
