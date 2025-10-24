import json
import math
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional

DEFAULT_TECHNIQUES = [
    {
        "name": "Credential Spray",
        "category": "Credential Access",
        "description": "Reuse of weak passwords across many discovered hosts.",
        "base_score": 0.45,
    },
    {
        "name": "SMB Relay",
        "category": "Lateral Movement",
        "description": "Intercepts NTLM handshakes to pivot across internal devices.",
        "base_score": 0.5,
    },
    {
        "name": "PowerShell Recon",
        "category": "Discovery",
        "description": "Collects host configuration data to seed follow-on attacks.",
        "base_score": 0.4,
    },
    {
        "name": "Phishing Dropper",
        "category": "Initial Access",
        "description": "Delivers weaponized payloads via simulated spear-phish campaigns.",
        "base_score": 0.35,
    },
    {
        "name": "Privilege Escalation Audit",
        "category": "Privilege Escalation",
        "description": "Analyzes service misconfigurations for local escalation paths.",
        "base_score": 0.42,
    },
]

STATE_DIR = Path(__file__).parent / "data"
STATE_FILE = STATE_DIR / "intelligence_state.json"
HISTORY_LIMIT = 50
SMOOTHING_FACTOR = 0.35
EXPLORATION_BONUS = 0.25


class AdaptiveIntelligence:
    """Lightweight reinforcement utility inspired by the Pwnagotchi agent."""

    def __init__(self, state_path: Path = STATE_FILE):
        self.state_path = Path(state_path)
        self._lock = threading.Lock()
        self.state: Dict[str, Any] = {"techniques": {}, "history": []}
        self._load_state()

    # ------------------------------------------------------------------
    # State Persistence
    # ------------------------------------------------------------------
    def _load_state(self) -> None:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        if self.state_path.exists():
            try:
                with self.state_path.open("r", encoding="utf-8") as handle:
                    self.state = json.load(handle)
            except (json.JSONDecodeError, OSError):
                self.state = {"techniques": {}, "history": []}
        for technique in DEFAULT_TECHNIQUES:
            self.state.setdefault("techniques", {})
            record = self.state["techniques"].setdefault(
                technique["name"],
                {
                    "name": technique["name"],
                    "category": technique["category"],
                    "description": technique["description"],
                    "attempts": 0,
                    "successes": 0,
                    "failures": 0,
                    "score": technique.get("base_score", 0.5),
                    "success_rate": 0.0,
                    "last_outcome": None,
                    "last_target": None,
                    "last_timestamp": None,
                    "avg_dwell_time": None,
                },
            )
            # Keep defaults up to date if they change between deployments
            record["category"] = technique["category"]
            record["description"] = technique["description"]
        self._persist()

    def _persist(self) -> None:
        try:
            with self.state_path.open("w", encoding="utf-8") as handle:
                json.dump(self.state, handle, indent=2)
        except OSError:
            # Persistence failure should not crash the app; log would be ideal but avoid dependency.
            pass

    # ------------------------------------------------------------------
    # Intelligence API
    # ------------------------------------------------------------------
    def record_attempt(
        self,
        *,
        technique: str,
        target: str,
        success: bool,
        dwell_time: Optional[float] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        with self._lock:
            technique_state = self.state.setdefault("techniques", {}).setdefault(
                technique,
                {
                    "name": technique,
                    "category": "Unclassified",
                    "description": "User defined tactic registered from runtime telemetry.",
                    "attempts": 0,
                    "successes": 0,
                    "failures": 0,
                    "score": 0.5,
                    "success_rate": 0.0,
                    "last_outcome": None,
                    "last_target": None,
                    "last_timestamp": None,
                    "avg_dwell_time": None,
                },
            )

            technique_state["attempts"] += 1
            if success:
                technique_state["successes"] += 1
            else:
                technique_state["failures"] += 1

            observed = 1.0 if success else 0.0
            technique_state["score"] = (
                (1 - SMOOTHING_FACTOR) * technique_state.get("score", 0.5)
                + SMOOTHING_FACTOR * observed
            )
            technique_state["success_rate"] = (
                technique_state["successes"] / float(technique_state["attempts"])
            )
            technique_state["last_outcome"] = "success" if success else "failure"
            technique_state["last_target"] = target
            technique_state["last_timestamp"] = timestamp

            if dwell_time is not None:
                current_avg = technique_state.get("avg_dwell_time")
                if current_avg is None:
                    technique_state["avg_dwell_time"] = float(dwell_time)
                else:
                    technique_state["avg_dwell_time"] = round(
                        (current_avg * 0.7) + (float(dwell_time) * 0.3),
                        2,
                    )

            history_entry = {
                "timestamp": timestamp,
                "technique": technique,
                "target": target,
                "outcome": "success" if success else "failure",
            }
            if dwell_time is not None:
                history_entry["dwellTime"] = dwell_time
            if notes:
                history_entry["notes"] = notes

            history = self.state.setdefault("history", [])
            history.append(history_entry)
            if len(history) > HISTORY_LIMIT:
                del history[:-HISTORY_LIMIT]

            self._persist()
            return {
                "technique": technique,
                "target": target,
                "success": success,
                "timestamp": timestamp,
                "score": round(technique_state["score"], 3),
                "successRate": round(technique_state["success_rate"], 3),
            }

    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            techniques = list(self.state.get("techniques", {}).values())
            ranked = sorted(
                (
                    self._decorate_technique_for_summary(tech)
                    for tech in techniques
                ),
                key=lambda entry: entry["priority"],
                reverse=True,
            )

            total_attempts = sum(tech["attempts"] for tech in techniques)
            total_successes = sum(tech["successes"] for tech in techniques)
            overall_success = (
                (total_successes / total_attempts) if total_attempts else 0.0
            )

            return {
                "recommendations": ranked[:5],
                "stats": {
                    "techniquesTracked": len(techniques),
                    "totalAttempts": total_attempts,
                    "overallSuccessRate": round(overall_success, 3),
                },
                "recentHistory": list(reversed(self.state.get("history", [])[-10:])),
            }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _decorate_technique_for_summary(self, technique_state: Dict[str, Any]) -> Dict[str, Any]:
        attempts = technique_state.get("attempts", 0)
        score = technique_state.get("score", 0.5)
        exploration = EXPLORATION_BONUS / math.sqrt(attempts or 1)
        recency_bonus = 0.0
        last_timestamp = technique_state.get("last_timestamp")
        if last_timestamp:
            try:
                last_time = time.strptime(last_timestamp, "%Y-%m-%dT%H:%M:%SZ")
                elapsed_hours = max(
                    (time.time() - time.mktime(last_time)) / 3600.0,
                    1.0,
                )
                recency_bonus = min(0.2, 0.05 / math.log1p(elapsed_hours))
            except ValueError:
                recency_bonus = 0.0
        priority = score + exploration + recency_bonus
        return {
            "name": technique_state.get("name"),
            "category": technique_state.get("category"),
            "description": technique_state.get("description"),
            "attempts": attempts,
            "successes": technique_state.get("successes", 0),
            "failures": technique_state.get("failures", 0),
            "score": round(score, 3),
            "successRate": round(technique_state.get("success_rate", 0.0), 3),
            "avgDwellTime": technique_state.get("avg_dwell_time"),
            "lastOutcome": technique_state.get("last_outcome"),
            "lastTarget": technique_state.get("last_target"),
            "lastTimestamp": technique_state.get("last_timestamp"),
            "priority": round(priority, 3),
        }

