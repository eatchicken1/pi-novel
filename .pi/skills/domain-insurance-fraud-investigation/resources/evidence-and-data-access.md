# 证据来源与数据访问

## ProfessionalEvidenceSource

category（internal-claim-file/underwriting-record/policy-record/internal-system-log/medical-record/financial-record/digital-record/physical-inspection/interview/public-record/industry-platform/third-party-service/regulator-or-law-enforcement-return/other）、holder、accessMode（direct-role-access/internal-approval/consent-based/contractual-request/collaboration-request/public/regulator-or-law-enforcement-only/unavailable）、requiredAuthorityIds、privacyOrSensitivity、verificationLimitations、chainOrProvenanceNote。

## 规则

1. 存在某数据 ≠ 主角可以访问：accessMode + requiredAuthorityIds 决定；
2. restricted accessMode（internal-approval/consent-based/contractual-request/collaboration-request/regulator-or-law-enforcement-only）必须声明 requiredAuthorityIds（EVIDENCE_ACCESS_WITHOUT_AUTHORITY）；
3. action 使用 unavailable 数据 → ACTION_EVIDENCE_INACCESSIBLE；使用 restricted 数据但 action 权限不满足 → ACTION_EVIDENCE_INACCESSIBLE；
4. 高敏感数据（privacyOrSensitivity=highly-sensitive）的使用必须有相应 authority/access path（项目自声明的规则自洽即可，不写具体法律结论）。

## Professional Evidence ≠ Mystery Clue

ProfessionalEvidenceSource 描述“职业上可以从哪里取得信息”；MysteryClue 描述“故事里真正出现并参与推理的可观察事实”。两者不自动等同（如：公司门禁系统 ≠ 02:17 门禁凭证被使用）。Round 4 不自动创建 MysteryClue；Phase 5 才建立 Action → Observation → Clue realization。
