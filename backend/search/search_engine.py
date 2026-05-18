from backend.algorithms.scorer import combined_score
from backend.algorithms.utility import normalize_name
from backend.ml.predictor import predict_score

def find_best_matches(input_name, db_records, threshold=0.6, max_results=10, use_ml=True):
    input_name = normalize_name(input_name)
    matches = []
    fallback_pool = []

    for record in db_records:
        full_name = f"{record['first_name']} {record['last_name']}".lower()
        normalized_full_name = normalize_name(full_name)

        # if the input name is an exact match show it first
        if input_name in normalized_full_name:
            match = record.copy()
            match["score"] = 100.0
            match["matched_by"] = "substring"
            matches.append(match)
            continue

        score = predict_score(input_name, normalized_full_name) if use_ml else combined_score(input_name, normalized_full_name)
        score = round(score * 100, 2)

        match = record.copy()
        match["score"] = score

        if score >= threshold * 100:
            matches.append(match)
        else:
            fallback_pool.append(match)

    if not matches and fallback_pool:
        fallback_pool.sort(key=lambda x: x["score"], reverse=True)
        fallback_matches = fallback_pool[:max_results]
        for m in fallback_matches:
            m["below_threshold"] = True
        return fallback_matches

    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches[:max_results]