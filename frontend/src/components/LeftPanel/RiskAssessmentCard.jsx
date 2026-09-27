import { useSelector } from "react-redux";

function RiskSummary({ label, value }) {
  const isEmpty = !value;
  return (
    <div className="field risk-field">
      <span className="field__label">{label}</span>
      <div className={`field__input field__textarea risk-summary__content ${isEmpty ? "risk-summary__content--empty" : ""}`}>
        {value || "AI suggestions will appear after event details are provided…"}
      </div>
    </div>
  );
}

export default function RiskAssessmentSection() {
  const { riskAssessment } = useSelector((s) => s.deviation);
  const summaries = [
    {
      label: "AI Severity & Likely Cause",
      value: [
        ["Severity classification", riskAssessment.severityClassification],
        ["Possible reasons", riskAssessment.rootCauseHypothesis],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${value}`)
        .join("\n\n"),
    },
    {
      label: "QA Actions & Impact",
      value: [
        ["Recommended QA actions", riskAssessment.nextQaActions],
        ["Quality / regulatory impact", riskAssessment.regulatoryQualityImpact],
        ["Next steps", riskAssessment.nextStepsAndAssurance],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${value}`)
        .join("\n\n"),
    },
  ];

  return (
    <div className="risk-section">
      <h3 className="risk-section__title">Possible Reasons &amp; Actions</h3>
      <div className="risk-field-grid">
        {summaries.map(({ label, value }) => (
          <RiskSummary key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}
