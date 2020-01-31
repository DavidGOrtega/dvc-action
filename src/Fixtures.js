
const DVC_METRICS_DIFF_STUB = {"metrics.json": {"types.top5-error": {"old": 0.525454, "new": 0.5254552, "diff": 1.2000000000345068e-06}, "error-rate": {"old": 0.192458, "new": 0.19655656, "diff": 0.004098560000000001}, "AUC": {"old": 0.674134, "new": 0.675554, "diff": 0.0014199999999999768}, "types.top10-error": {"old": 0.86642, "new": 0.86857, "diff": 0.0021499999999999853}}}

const METRICS = { 
    "history.json@current": 
    [
        {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
        {"step":1, "accu":0.3, "loss":0.8, "val_accu":0.35, "val_loss": 0.85}, 
        {"step":3, "accu":0.6, "loss":0.6, "val_accu":0.65, "val_loss": 0.65}, 
        {"step":4, "accu":0.8, "loss":0.3, "val_accu":0.85, "val_loss": 0.35}, 
        {"step":5, "accu":0.9, "loss":0.1, "val_accu":0.95, "val_loss":0.15}
    ],
    "history.json@old": 
    [
        {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
        {"step":1, "accu":0.3, "loss":0.8, "val_accu":0.35, "val_loss": 0.85}, 
        {"step":3, "accu":0.6, "loss":0.6, "val_accu":0.65, "val_loss": 0.65}, 
        {"step":4, "accu":0.8, "loss":0.3, "val_accu":0.85, "val_loss": 0.35}, 
        {"step":5, "accu":0.9, "loss":0.1, "val_accu":0.95, "val_loss":0.15}
    ],
    "history.json": 
    [
        {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
        {"step":1, "accu":0.3, "loss":0.8, "val_accu":0.35, "val_loss": 0.85}, 
        {"step":3, "accu":0.6, "loss":0.6, "val_accu":0.65, "val_loss": 0.65}, 
        {"step":4, "accu":0.8, "loss":0.3, "val_accu":0.85, "val_loss": 0.35}, 
        {"step":5, "accu":0.9, "loss":0.1, "val_accu":0.95, "val_loss":0.15}
    ],
    "history.json@branch1": 
    [
        {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
        {"step":1, "accu":0.4, "loss":0.9, "val_accu":0.4, "val_loss": 0.9}, 
        {"step":3, "accu":0.5, "loss":0.7, "val_accu":0.5, "val_loss": 0.7}, 
        {"step":4, "accu":0.6, "loss":0.5, "val_accu":0.6, "val_loss": 0.5}, 
        {"step":5, "accu":0.8, "loss":0.3, "val_accu":0.8, "val_loss":0.3},
    ],
    "history.json@branch2": 
    [
        {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
        {"step":1, "accu":0.35, "loss":0.7, "val_accu":0.5, "val_loss": 0.7}, 
        {"step":3, "accu":0.66, "loss":0.5, "val_accu":0.6, "val_loss": 0.5}, 
        {"step":4, "accu":0.88, "loss":0.2, "val_accu":0.9, "val_loss": 0.2}, 
        {"step":5, "accu":0.99, "loss":0.05, "val_accu":0.99, "val_loss":0.05}
    ]

}

const FIXTURES2 = { 
    "history.json": {
        "current": 
        [
            {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
            {"step":1, "accu":0.3, "loss":0.8, "val_accu":0.35, "val_loss": 0.85}, 
            {"step":3, "accu":0.6, "loss":0.6, "val_accu":0.65, "val_loss": 0.65}, 
            {"step":4, "accu":0.8, "loss":0.3, "val_accu":0.85, "val_loss": 0.35}, 
            {"step":5, "accu":0.9, "loss":0.1, "val_accu":0.95, "val_loss":0.15}
        ],
        "old": 
        [
            {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
            {"step":1, "accu":0.3, "loss":0.8, "val_accu":0.35, "val_loss": 0.85}, 
            {"step":3, "accu":0.6, "loss":0.6, "val_accu":0.65, "val_loss": 0.65}, 
            {"step":4, "accu":0.8, "loss":0.3, "val_accu":0.85, "val_loss": 0.35}, 
            {"step":5, "accu":0.9, "loss":0.1, "val_accu":0.95, "val_loss":0.15}
        ],
        "master": 
        [
            {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
            {"step":1, "accu":0.3, "loss":0.8, "val_accu":0.35, "val_loss": 0.85}, 
            {"step":3, "accu":0.6, "loss":0.6, "val_accu":0.65, "val_loss": 0.65}, 
            {"step":4, "accu":0.8, "loss":0.3, "val_accu":0.85, "val_loss": 0.35}, 
            {"step":5, "accu":0.9, "loss":0.1, "val_accu":0.95, "val_loss":0.15}
        ],
        "branch1": 
        [
            {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
            {"step":1, "accu":0.4, "loss":0.9, "val_accu":0.4, "val_loss": 0.9}, 
            {"step":3, "accu":0.5, "loss":0.7, "val_accu":0.5, "val_loss": 0.7}, 
            {"step":4, "accu":0.6, "loss":0.5, "val_accu":0.6, "val_loss": 0.5}, 
            {"step":5, "accu":0.8, "loss":0.3, "val_accu":0.8, "val_loss":0.3},
        ],
        "branch2": 
        [
            {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
            {"step":1, "accu":0.35, "loss":0.7, "val_accu":0.5, "val_loss": 0.7}, 
            {"step":3, "accu":0.66, "loss":0.5, "val_accu":0.6, "val_loss": 0.5}, 
            {"step":4, "accu":0.88, "loss":0.2, "val_accu":0.9, "val_loss": 0.2}, 
            {"step":5, "accu":0.99, "loss":0.05, "val_accu":0.99, "val_loss":0.05}
        ]
    }
}


exports.DVC_METRICS_DIFF_STUB = DVC_METRICS_DIFF_STUB;
exports.METRICS = METRICS;