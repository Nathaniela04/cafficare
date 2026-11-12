"""
Kopi & Kondisi (CaffiCare) — aplikasi web prediksi tingkat kesehatan peminum kopi.

Cara pakai:
1. Salin file model_terbaik.pkl, scaler_terbaik.pkl, dan feature_names.pkl
   (hasil dari notebook deal_kopi_lengkap.ipynb) ke folder yang sama dengan app.py.
2. pip install -r requirements.txt
3. python app.py
4. Buka http://127.0.0.1:5000 di browser.
"""

import io
import os
import warnings

# Suppress versi-mismatch warning dari scikit-learn saat model di-load
warnings.filterwarnings(
    "ignore",
    category=UserWarning,
    message=".*InconsistentVersionWarning.*"
)
try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except ImportError:
    pass

import joblib
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

MODEL_PATH = "model_terbaik.pkl"
SCALER_PATH = "scaler_terbaik.pkl"
FEATURES_PATH = "feature_names.pkl"

model = None
scaler = None
feature_names = None
model_info = {"nama": "-", "akurasi": None}


def load_artifacts():
    """Memuat model, scaler, dan daftar fitur hasil training. Aman dipanggil ulang."""
    global model, scaler, feature_names, model_info
    if all(os.path.exists(p) for p in (MODEL_PATH, SCALER_PATH, FEATURES_PATH)):
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        feature_names = joblib.load(FEATURES_PATH)
        model_info["nama"] = type(model).__name__
        return True
    return False


load_artifacts()

# Mapping kelas dari output model (baik string "Health"/"Mild"/"Moderate" maupun angka 0/1/2)
CLASS_META = {
    "Health": {"id": "Sehat", "en": "Health", "slug": "sehat"},
    "Mild": {"id": "Cukup Sehat", "en": "Mild", "slug": "cukup-sehat"},
    "Moderate": {"id": "Kurang Sehat", "en": "Moderate", "slug": "kurang-sehat"},
    0: {"id": "Sehat", "en": "Health", "slug": "sehat"},
    1: {"id": "Cukup Sehat", "en": "Mild", "slug": "cukup-sehat"},
    2: {"id": "Kurang Sehat", "en": "Moderate", "slug": "kurang-sehat"},
}

SLEEP_QUALITY_MAP = {"Poor": 0, "Fair": 1, "Good": 2, "Excellent": 3}
STRESS_LEVEL_MAP = {"Low": 0, "Medium": 1, "High": 2}

REQUIRED_RAW_COLUMNS = [
    "Age", "Gender", "Coffee_Intake", "Sleep_Hours", "Sleep_Quality",
    "BMI", "Heart_Rate", "Stress_Level", "Physical_Activity_Hours",
    "Smoking", "Alcohol_Consumption",
]


def age_group(age):
    """Diskretisasi usia sesuai Tabel 3.12 pada Bab III."""
    if age < 25:
        return 0  # Youth
    elif age < 45:
        return 1  # Adult
    elif age < 60:
        return 2  # Middle-aged
    return 3  # Elderly


def to_bool_flag(value):
    """Menerima berbagai bentuk input Ya/Tidak, 1/0, True/False -> 0 atau 1."""
    s = str(value).strip().lower()
    return 1 if s in ("1", "ya", "yes", "true", "y") else 0


def preprocess_row(row):
    """Mengubah satu baris data mentah menjadi fitur numerik, mengikuti
    urutan tahapan Data Preparation pada Bab III (encoding, diskretisasi usia)."""
    d = {}
    # Fitur diskretisasi usia dinamai Age_Category sesuai feature_names model
    d["Age_Category"] = age_group(float(row["Age"]))
    d["Coffee_Intake"] = float(row["Coffee_Intake"])

    caffeine = row.get("Caffeine_mg", None)
    if caffeine is None or str(caffeine).strip() == "":
        # Estimasi otomatis, sesuai definisi Caffeine_mg pada dataset asli (cangkir x 95 mg)
        d["Caffeine_mg"] = d["Coffee_Intake"] * 95
    else:
        d["Caffeine_mg"] = float(caffeine)

    d["Sleep_Hours"] = float(row["Sleep_Hours"])
    d["Sleep_Quality"] = SLEEP_QUALITY_MAP.get(str(row["Sleep_Quality"]), 2)
    d["BMI"] = float(row["BMI"])
    d["Heart_Rate"] = float(row["Heart_Rate"])
    d["Stress_Level"] = STRESS_LEVEL_MAP.get(str(row["Stress_Level"]), 1)
    d["Physical_Activity_Hours"] = float(row["Physical_Activity_Hours"])

    gender = str(row["Gender"]).strip().lower()
    d["Gender_Male"] = 1 if gender == "male" else 0
    d["Gender_Other"] = 1 if gender == "other" else 0

    d["Smoking_1"] = to_bool_flag(row["Smoking"])
    d["Alcohol_Consumption_1"] = to_bool_flag(row["Alcohol_Consumption"])
    return d


def predict_dataframe(df_raw):
    """Menjalankan preprocessing + prediksi untuk seluruh baris pada DataFrame mentah."""
    rows = [preprocess_row(r) for r in df_raw.to_dict(orient="records")]
    X = pd.DataFrame(rows)
    X = X[feature_names]
    X_scaled = scaler.transform(X) if scaler is not None else X
    preds = model.predict(X_scaled)
    probs = model.predict_proba(X_scaled) if hasattr(model, "predict_proba") else None
    return preds, probs


@app.route("/")
def index():
    return render_template(
        "index.html",
        model_ready=(model is not None),
        model_nama=model_info["nama"],
    )


@app.route("/status")
def status():
    ready = load_artifacts() if model is None else True
    return jsonify({"model_ready": ready, "model_nama": model_info["nama"]})


@app.route("/predict_single", methods=["POST"])
def predict_single():
    if model is None and not load_artifacts():
        return jsonify({
            "error": "Model belum ditemukan. Pastikan model_terbaik.pkl, "
                     "scaler_terbaik.pkl, dan feature_names.pkl ada di folder aplikasi."
        }), 500

    data = request.get_json(force=True)
    try:
        df_raw = pd.DataFrame([data])
        preds, probs = predict_dataframe(df_raw)
    except KeyError as e:
        return jsonify({"error": f"Data tidak lengkap, kolom hilang: {e}"}), 400
    except ValueError as e:
        return jsonify({"error": f"Nilai tidak valid: {e}"}), 400

    pred_val = preds[0]
    meta = CLASS_META.get(pred_val, {"id": str(pred_val), "en": str(pred_val), "slug": "sehat"})

    result = {
        "label_id": meta["id"],
        "label_en": meta["en"],
        "slug": meta["slug"],
    }

    if probs is not None:
        classes = getattr(model, "classes_", [0, 1, 2])
        prob_dict = {}
        for i, p in enumerate(probs[0]):
            cls_val = classes[i]
            cls_meta = CLASS_META.get(cls_val, {"id": str(cls_val)})
            prob_dict[cls_meta["id"]] = round(float(p) * 100, 1)
        result["probabilities"] = prob_dict

    return jsonify(result)


@app.route("/predict_batch", methods=["POST"])
def predict_batch():
    if model is None and not load_artifacts():
        return jsonify({
            "error": "Model belum ditemukan. Pastikan model_terbaik.pkl, "
                     "scaler_terbaik.pkl, dan feature_names.pkl ada di folder aplikasi."
        }), 500

    file = request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"error": "Belum ada berkas CSV yang diunggah."}), 400

    try:
        df_raw = pd.read_csv(file)
    except Exception as e:
        return jsonify({"error": f"Berkas CSV tidak dapat dibaca: {e}"}), 400

    missing = [c for c in REQUIRED_RAW_COLUMNS if c not in df_raw.columns]
    if missing:
        return jsonify({
            "error": "Kolom berikut belum ada pada berkas CSV: " + ", ".join(missing)
                     + ". Unduh templat CSV untuk melihat format yang benar."
        }), 400

    try:
        preds, probs = predict_dataframe(df_raw)
    except ValueError as e:
        return jsonify({"error": f"Ada nilai yang tidak dikenali pada CSV: {e}"}), 400

    df_result = df_raw.copy()
    df_result["Prediksi_Kesehatan"] = [
        CLASS_META.get(p, {"id": str(p)})["id"] for p in preds
    ]

    if probs is not None:
        classes = getattr(model, "classes_", [0, 1, 2])
        for i, cls_val in enumerate(classes):
            cls_name = CLASS_META.get(cls_val, {"id": str(cls_val)})["id"]
            df_result[f"Probabilitas_{cls_name} (%)"] = (probs[:, i] * 100).round(1)

    csv_buffer = io.StringIO()
    df_result.to_csv(csv_buffer, index=False)

    summary = df_result["Prediksi_Kesehatan"].value_counts().to_dict()
    preview_cols = REQUIRED_RAW_COLUMNS + ["Prediksi_Kesehatan"]
    preview_cols = [c for c in preview_cols if c in df_result.columns]

    # Ganti NaN dengan None agar serialisasi JSON valid dan tidak memicu error di browser
    df_preview = df_result[preview_cols].head(50).replace({np.nan: None})

    return jsonify({
        "total_baris": len(df_result),
        "ringkasan": summary,
        "preview": df_preview.to_dict(orient="records"),
        "csv_data": csv_buffer.getvalue(),
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
