from flask import Flask, request, jsonify
from flask_cors import CORS
from lambda_ranking import score_candidate

app = Flask(__name__)
CORS(app)


@app.route("/rank", methods=["POST", "OPTIONS"])
def rank():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    donation = data.get("donation", {})
    candidates = data.get("candidates", [])
    candidate_type = data.get("candidateType", "ngo")
    top_n = data.get("topN", 3)

    scored = []
    for candidate in candidates:
        score = score_candidate(donation, candidate, candidate_type)
        scored.append({"candidate": candidate, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    top_candidates = scored[:top_n]

    return jsonify(
        {
            "success": True,
            "recommendations": top_candidates,
            "totalScored": len(candidates),
        }
    )


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)
