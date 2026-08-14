// Scene & Prose Intelligence：场景构造 / 对话 / 情绪 / 信息投放 / 声音 / POV 的确定性检查。
// 规则说明：deterministic checker 只检查可确定的结构问题；文学判断（subtext、voice convergence、装饰性比喻等）
// 由模型 findings 经 diagnose_chapter 的 modelFindings 通道合并（不能把小说写成模板）。
import type { SceneDesign, VoiceFingerprint, VoiceProfile } from "../schemas.ts";
import type { DesignCheckFinding } from "./story-design.ts";

const isEmpty = (value: string | undefined): boolean => value === undefined || value.trim().length === 0;
const blankOrNone = (value: string | undefined): boolean => isEmpty(value) || value === undefined || /^(?:无|无转折|无变化|无阻力|没有|没有变化|未知)$/u.test(value.trim());
const countOf = (text: string, regex: RegExp): number => {
	const matches = text.match(regex);
	return matches === null ? 0 : matches.length;
};

// ==== Scene Design 检查 ====
const GOAL_ABSTRACT_RE = /^(?:调查案件|和丈夫谈谈|解决问题|了解情况|沟通一下|谈谈|查一下|核实一下|看看|处理|想办法|继续调查)$/u;
const WEAK_OPPOSITION_RE = /^(?:无|没有|无阻力|没有阻力|无明显阻力|对方不愿意说|他不愿意|不愿意配合|沉默|难说)$/u;
const OPENING_INERT_RE = /(?:天气|走进|坐下|点菜|寒暄|倒茶|寒暄两句|推门进来|走到窗边|打量)/u;
const FALSE_CLIFFHANGER_RE = /(?:真正的危险才刚刚开始|她不知道，|他不知道，|暴风雨|暗流涌动)/u;
const PHONE_TRIGGER_RE = /(?:电话|短信|敲门|门铃|手机响|突然出现|来电)/u;

export function checkSceneDesigns(scenes: SceneDesign[], context: { anchorEventIds: Set<number>; irreversibleEventIds: Set<number>; revealEventIds: Set<number>; allEventIds: Set<number> }): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const { anchorEventIds, irreversibleEventIds, revealEventIds, allEventIds } = context;
	const isHighValue = (scene: SceneDesign): boolean => scene.eventIds.some((eventId) => anchorEventIds.has(eventId) || irreversibleEventIds.has(eventId) || revealEventIds.has(eventId));
	let transitionTriggerCount = 0;
	let sequentialNoDecisionRun = 0;
	for (const scene of scenes) {
		const highValue = isHighValue(scene);
		for (const eventId of scene.eventIds) {
			if (!allEventIds.has(eventId)) findings.push({ code: "SCENE_EVENT_UNKNOWN", severity: "error", message: `scene ${scene.sceneId} 引用的事件 ${eventId} 不在本章事件图中`, targetRefs: [scene.sceneId] });
		}
		if (scene.eventIds.length === 0 && scene.beatPlan.every((beat) => beat.paysOffRef === undefined)) findings.push({ code: "ORPHAN_SCENE", severity: "warning", message: `scene ${scene.sceneId} 没有 event refs 也没有 payoff；必须有 cannotRemoveBecause 解释其故事功能`, targetRefs: [scene.sceneId] });
		if (scene.mode === "summary-transition") {
			if (highValue) findings.push({ code: "SCENE_UNDERDRAMATIZED", severity: "warning", message: `重大事件（anchor/irreversible/reveal）被 summary-transition 带过：scene ${scene.sceneId}`, targetRefs: [scene.sceneId] });
			continue;
		}
		if (isEmpty(scene.focalCharacterGoal) || GOAL_ABSTRACT_RE.test(scene.focalCharacterGoal.trim()) || scene.focalCharacterGoal.trim().length < 6) findings.push({ code: "SCENE_GOAL_TOO_ABSTRACT", severity: "warning", message: `scene ${scene.sceneId} 的目标太抽象：${scene.focalCharacterGoal}；目标必须是可验证的具体动作`, targetRefs: [scene.sceneId] });
		const weakOpposition = isEmpty(scene.opposingForce) || WEAK_OPPOSITION_RE.test(scene.opposingForce.trim());
		if (weakOpposition) findings.push({ code: "SCENE_WITHOUT_MEANINGFUL_OPPOSITION", severity: "warning", message: `scene ${scene.sceneId} 没有真正阻力（${scene.opposingForce}）；阻力不能只是“对方不愿意说”`, targetRefs: [scene.sceneId] });
		if (scene.beatPlan.length >= 4 && !scene.beatPlan.some((beat) => beat.tacticChange === true) && !weakOpposition) findings.push({ code: "SCENE_TACTIC_NEVER_CHANGES", severity: "warning", message: `scene ${scene.sceneId} 有 ${scene.beatPlan.length} 个 beat 且 tactic 从未变化；持续受阻时应换策略或付出代价离开`, targetRefs: [scene.sceneId] });
		if (highValue && blankOrNone(scene.turn)) findings.push({ code: "SCENE_WITHOUT_TURN", severity: "warning", message: `high-value scene ${scene.sceneId} 没有 turn；她想确认 A 却发现 B / 她想隐瞒对方却先开口`, targetRefs: [scene.sceneId] });
		if (blankOrNone(scene.stateChange)) findings.push({ code: "SCENE_WITHOUT_STATE_CHANGE", severity: highValue ? "error" : "warning", message: `scene ${scene.sceneId} 结束没有 state change；场景不能只是“谈完了”`, targetRefs: [scene.sceneId] });
		if (blankOrNone(scene.entryState)) findings.push({ code: "SCENE_ENTRY_UNMOTIVATED", severity: "warning", message: `scene ${scene.sceneId} 没有 entryState；为什么现在进入这场戏没有被解释`, targetRefs: [scene.sceneId] });
		if (blankOrNone(scene.exitPressure)) findings.push({ code: "SCENE_EXIT_FLAT", severity: "warning", message: `scene ${scene.sceneId} 没有 exitPressure；场景结束应留下决定/成本/新问题/改变的关系`, targetRefs: [scene.sceneId] });
		else if (FALSE_CLIFFHANGER_RE.test(scene.exitPressure)) findings.push({ code: "FALSE_CLIFFHANGER", severity: "warning", message: `scene ${scene.sceneId} 的 exitPressure 是虚假悬念句；下一场景必须有对应后果`, targetRefs: [scene.sceneId] });
		if (scene.mode === "full-scene" && !highValue && scene.beatPlan.length >= 6 && weakOpposition && blankOrNone(scene.turn)) findings.push({ code: "SCENE_OVEREXPANDED", severity: "warning", message: `桥接事件被 ${scene.beatPlan.length} 个 beat 的 full-scene 撑大：scene ${scene.sceneId}；低价值事件应压缩或转场`, targetRefs: [scene.sceneId] });
		if (scene.scenePurpose.kind === "recover" && blankOrNone(scene.stateChange)) findings.push({ code: "RECOVERY_WITHOUT_NEW_STATE", severity: "warning", message: `recovery scene ${scene.sceneId} 没有新状态；恢复必须吸收代价/做选择/改变关系/制造 false security`, targetRefs: [scene.sceneId] });
		if (highValue && scene.beatPlan.some((beat) => beat.emotionalShift !== undefined) && blankOrNone(scene.decisionOrDiscovery)) findings.push({ code: "EMOTION_WITHOUT_DECISION_EFFECT", severity: "warning", message: `high-value scene ${scene.sceneId} 有强情绪 beat 但没有任何 choice/tactic/relationship behavior 作用；story-bearing emotion 必须影响选择`, targetRefs: [scene.sceneId] });
		if (scene.beatPlan.length > 0 && OPENING_INERT_RE.test(scene.beatPlan[0].action + (scene.entryState ?? ""))) findings.push({ code: "SCENE_OPENING_INERT", severity: "warning", message: `scene ${scene.sceneId} 以天气/走路/坐下/寒暄开场；开场应迅速建立 current task / tension / abnormality`, targetRefs: [scene.sceneId] });
		if (PHONE_TRIGGER_RE.test(scene.exitPressure + scene.decisionOrDiscovery)) transitionTriggerCount += 1;
		sequentialNoDecisionRun = blankOrNone(scene.decisionOrDiscovery) ? sequentialNoDecisionRun + 1 : 0;
		if (sequentialNoDecisionRun >= 3) {
			findings.push({ code: "SCENE_SEQUENCE_CAUSALLY_WEAK", severity: "warning", message: "连续 3 个 scene 都没有 decisionOrDiscovery；场景只是并排查资料，Scene consequence 没有驱动下一 Scene 动机" });
			sequentialNoDecisionRun = 0;
		}
	}
	if (scenes.length >= 4 && new Set(scenes.map((scene) => scene.scenePurpose.kind ?? "")).size === 1) findings.push({ code: "RHYTHM_MONOTONY", severity: "warning", message: `本章 ${scenes.length} 个 scene 全部是同一 purpose；章节节奏单调（${scenes[0].scenePurpose.kind}）` });
	if (transitionTriggerCount >= 2) findings.push({ code: "TRANSITION_TRIGGER_REPETITION", severity: "warning", message: `本章 ${transitionTriggerCount} 个 scene 靠电话/短信/敲门/突然出现触发转折；关键 turn 过度依赖外部触发器` });
	return findings;
}

// ==== Prose 检查（对话 / 情绪 / 信息 / 职业 / 社会 / 悬疑 / 声音 / POV）====
const SHARED_KNOWLEDGE_RE = /(?:我们结婚|你一直是|咱们这么多年|我们是夫妻|你是我丈夫|我们在一起|你一直做)/u;
const EXPLICIT_RELATIONSHIP_RE = /(?:我不信任你|你不尊重我|我们的婚姻|你不爱我了|你根本不在乎|我们离婚吧)/u;
const SILENCE_RE = /(?:他沉默|她沉默|她没说话|他没说话|没人开口|谁也没开口|一片沉默|谁都没有说话)/gu;
const DIALOGUE_THEN_EXPLANATION_RE = /(?:他说|她说|他道|她道)。(?:她|他)(?:知道|明白|意识到)/gu;
const EMOTION_LABEL_RE = /(?:她很愤怒|她感到愤怒|她悲伤|她很失望|她震惊|她害怕|她难过|她委屈|她心寒|她绝望)/gu;
const ACTION_EXPLAINED_RE = /(?:她这么做，是因为|她之所以|这是因(?:为|她)终于|她忽然(?:意识到|明白)|她终于明白|她这才意识到)/gu;
const DECISION_VERB_RE = /(?:决定|拒绝|提交|放下|起身|拨打|离开|签字|拨通|关掉|锁进|收进|拿起|挂断)/u;
const PROFESSIONAL_TERMS_RE = /(?:赔付率|核赔|再保险|承保|理赔|保单|证据链|审批|权限|门禁|结算|免责期|等待期|反欺诈|理赔档案|调查科)/gu;
const SOCIAL_COMMENT_RE = /(?:这个制度就是|说白了|本质上就是|这个社会|系统就是这样|规则就是这样|说到底)/u;
const CLUE_EXPLICIT_RE = /(?:这就是关键证据|关键证据是|这就是真相|真相终于|关键线索)/u;
const MYSTERY_EXPLAIN_RE = /(?:这意味着|这说明|原来如此|其实真相|换句话说)/gu;
const POV_LEAK_RE = /(?:她不知道的是|他心里想|她心里想|他其实|她其实|（后来我才知道）)/u;
const MARRIAGE_STATED_RE = /(?:你总是替我做决定|你一直这样|你就是这种人|你从来)/u;
const FRAGMENT_LINE_RE = /^[^，、“"]{1,8}[。！？]?$/u;
const METAPHOR_RE = /(?:像|仿佛|如同|宛如)/gu;
const INTERIORITY_RE = /(?:我(?:觉得|想|以为|猜|担心|怕|希望|决定)|我心里|我想了想)/gu;

export function checkChapterProse(prose: string, context: { voiceProfile?: VoiceProfile; pov: string }): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const lines = prose.split(/\r?\n/u);
	const dialogueLines = lines.filter((line) => line.includes("“"));
	let qaPairs = 0;
	for (let index = 0; index < lines.length - 1; index += 1) {
		if (lines[index].includes("？") && lines[index + 1].includes("“") && !lines[index + 1].includes("？")) qaPairs += 1;
	}
	if (qaPairs >= 5 && dialogueLines.length >= 8 && qaPairs / dialogueLines.length >= 0.45) findings.push({ code: "DIALOGUE_TOO_TRANSACTIONAL", severity: "warning", message: `连续 ${qaPairs} 组“问→完整回答”；对话变成信息交换，不是人物行动` });
	if (SHARED_KNOWLEDGE_RE.test(prose)) findings.push({ code: "DIALOGUE_SHARED_KNOWLEDGE_EXPOSITION", severity: "warning", message: "角色在互相告诉对方两人都知道的信息（写给读者看的 exposition）" });
	if (EXPLICIT_RELATIONSHIP_RE.test(prose)) findings.push({ code: "RELATIONSHIP_DIALOGUE_TOO_EXPLICIT", severity: "warning", message: "关系冲突被角色直接说出主题（我不信任你/你不尊重我）；应通过行为与潜台词表达" });
	const silenceCount = countOf(prose, SILENCE_RE);
	if (silenceCount >= 3) findings.push({ code: "SILENCE_OVERUSED", severity: "warning", message: `${silenceCount} 处沉默承担全部冲突；沉默不能成为万能表达` });
	const explanationCount = countOf(prose, DIALOGUE_THEN_EXPLANATION_RE);
	if (explanationCount >= 3) findings.push({ code: "DIALOGUE_THEN_EXPLANATION_OVERUSED", severity: "warning", message: `${explanationCount} 处“他说。她知道他的意思是……”；对话后的解释性心理复述成为模式` });
	const emotionLabels = countOf(prose, EMOTION_LABEL_RE);
	if (emotionLabels >= 3) findings.push({ code: "EMOTION_LABEL_WITHOUT_EFFECT", severity: "warning", message: `${emotionLabels} 处直接情绪标签且行为无变化；情绪应通过行为/选择/回避/注意/语言变化表现` });
	const overExplained = countOf(prose, ACTION_EXPLAINED_RE);
	if (overExplained >= 3) findings.push({ code: "ACTION_OVEREXPLAINED_BY_INTERIORITY", severity: "warning", message: `${overExplained} 处动作后立即心理解释；连续模式把动作的戏剧性拆掉` });
	const paragraphs = prose.split(/\n\s*\n/u);
	for (const paragraph of paragraphs) {
		const chars = paragraph.replace(/\s+/gu, "").length;
		const hasDialogue = paragraph.includes("“");
		if (chars >= 300 && !hasDialogue && !DECISION_VERB_RE.test(paragraph)) findings.push({ code: "INFORMATION_DUMP", severity: "warning", message: "连续大段传资料：没有 character objective、没有 opposition、没有 decision" });
		const professionalTerms = countOf(paragraph, PROFESSIONAL_TERMS_RE);
		if (professionalTerms >= 3 && chars >= 150 && !hasDialogue) findings.push({ code: "PROFESSIONAL_EXPOSITION_DUMP", severity: "warning", message: "职业知识像培训手册；职业细节必须改变 decision/access/conflict/evidence/consequence" });
		if (chars >= 80 && SOCIAL_COMMENT_RE.test(paragraph)) findings.push({ code: "SOCIAL_COMMENTARY_DUMP", severity: "warning", message: "社会议题像公众号评论；制度必须通过 procedure/power asymmetry/cost allocation 表现" });
	}
	const professionalTermsTotal = countOf(prose, PROFESSIONAL_TERMS_RE);
	if (professionalTermsTotal >= 10) findings.push({ code: "PROFESSIONAL_DENSITY_TOO_HIGH", severity: "warning", message: `${professionalTermsTotal} 处职业术语阻断人物行动；不是越专业越好` });
	if (CLUE_EXPLICIT_RE.test(prose)) findings.push({ code: "CLUE_DELIVERY_TOO_EXPLICIT", severity: "warning", message: "线索出现后立即告诉读者其意义（“这就是关键证据”）；observable fact 与 interpretation 应分开" });
	if (countOf(prose, MYSTERY_EXPLAIN_RE) >= 2) findings.push({ code: "MYSTERY_EXPLANATION_DUMP", severity: "warning", message: "线索意义被作者立即解释完；核心谜底线索应保留重新解释空间" });
	if (MARRIAGE_STATED_RE.test(prose)) findings.push({ code: "MARRIAGE_PATTERN_ONLY_STATED", severity: "warning", message: "旧互动模式被直接说出（“你总是替我做决定”）；应通过 trigger→default response→cost 表现" });
	if (context.pov === "heroine-first-person" && POV_LEAK_RE.test(prose)) findings.push({ code: "POV_KNOWLEDGE_LEAK", severity: "warning", message: "第一人称 narrator 说出了自己无法知道的信息（他人内心/作者真相）" });
	const fragmentCount = lines.filter((line) => FRAGMENT_LINE_RE.test(line.trim())).length;
	if (fragmentCount >= 8) findings.push({ code: "MINIMALIST_FRAGMENT_OVERUSE", severity: "warning", message: `${fragmentCount} 个极端短句；AI 式“高级克制”模板（一句。又一句。）` });
	const metaphorCount = countOf(prose, METAPHOR_RE);
	if (metaphorCount >= 10) findings.push({ code: "PROSE_DECORATIVE_WITHOUT_FUNCTION", severity: "warning", message: `${metaphorCount} 处比喻/环境抒情；装饰没有增强 character/tension/meaning/voice` });
	return findings;
}

// ==== Chase Wife 场景化 ====
const CHASE_PURSUIT_ROLES = new Set(["pursuit-control", "pursuit-failure"]);
const CHASE_REPAIR_ROLES = new Set(["repair-attempt", "credible-repair", "boundary-respect"]);
const VERBAL_ONLY_RE = /(?:道歉|对不起|我会改|我保证|我以后|都是我不好)/u;
const PURSUIT_ACTION_RE = /(?:堵|拦|送|联系|找|打电话|上门|发消息|转账|买|门口|楼下|公司|单位|蹲守|跟踪)/u;
const HEROINE_RESPONSE_RE = /(?:我没|我不|我拒绝|我挂断|我躲开|我走|我关|我拉黑|我没回|我沉默|我报警|我换了|我搬|我不接)/u;
const CONSEQUENCE_RE = /(?:报警|换了锁|起诉|搬家|递交|律师|证据|换了门锁|拒接|搬走|传票|函)/u;
const REPAIR_ACTION_RE = /(?:办了|提交|搬回|还|转|签字|接回|陪|办理|公开|交接|过户|结清|补|结账|转让|联系|接孩子)/u;
const RECOGNITION_INTERIOR_RE = /(?:他终于明白|他意识到|他懂了|他醒悟|这一刻，他|他忽然明白)/u;
const RECOGNITION_BEHAVIOR_RE = /(?:做了|选择|放弃|交还|签字|公开|离开|退|辞|把.{1,6}还|同意|承认)/u;

export function checkChaseEventProse(role: string | undefined, content: string): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	if (role === undefined) return findings;
	if (CHASE_PURSUIT_ROLES.has(role)) {
		if (VERBAL_ONLY_RE.test(content) && !PURSUIT_ACTION_RE.test(content)) findings.push({ code: "PURSUIT_WITHOUT_SPECIFIC_ACTION", severity: "warning", message: "wrong pursuit 只有道歉/承诺，没有具体行动（他做了什么、为什么错）" });
		if (!HEROINE_RESPONSE_RE.test(content)) findings.push({ code: "PURSUIT_WITHOUT_HEROINE_RESPONSE", severity: "warning", message: "wrong pursuit 场景没有女主的具体回应（拒绝/挂断/躲开/报警/拉黑）" });
		if (!CONSEQUENCE_RE.test(content)) findings.push({ code: "PURSUIT_WITHOUT_NEW_CONSEQUENCE", severity: "warning", message: "wrong pursuit 没有造成新后果；不能只写“他追了她很久”" });
	}
	if (CHASE_REPAIR_ROLES.has(role)) {
		if (VERBAL_ONLY_RE.test(content) && !REPAIR_ACTION_RE.test(content)) findings.push({ code: "REPAIR_ONLY_VERBAL", severity: "warning", message: "repair 只有口头承诺/道歉；repair 必须真实行动 + 成本 + 尊重边界" });
	}
	if (role === "recognition") {
		if (RECOGNITION_INTERIOR_RE.test(content) && !RECOGNITION_BEHAVIOR_RE.test(content)) findings.push({ code: "RECOGNITION_ONLY_INTERIOR", severity: "warning", message: "recognition 只有“他终于明白”；belief changed 必须通过行为变化证明" });
	}
	return findings;
}

// ==== Voice Fingerprint / Drift ====
export function analyzeVoiceFingerprint(chapter: number, prose: string, profile?: VoiceProfile): VoiceFingerprint {
	const normalized = prose.replace(/\s+/gu, "");
	const sentences = normalized.split(/[。！？!?]+/u).filter((sentence) => sentence.length > 0);
	const totalChars = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
	const average = sentences.length === 0 ? 0 : totalChars / sentences.length;
	const shortRatio = sentences.filter((sentence) => sentence.length <= 12).length / Math.max(sentences.length, 1);
	const longRatio = sentences.filter((sentence) => sentence.length >= 26).length / Math.max(sentences.length, 1);
	const sentenceRhythm = shortRatio >= 0.45 && longRatio >= 0.35 ? "mixed" : average <= 14 ? "short" : average >= 24 ? "long" : average <= 19 ? "medium" : "mixed";
	const interiorityRatio = countOf(prose, INTERIORITY_RE) / Math.max(sentences.length, 1);
	const interiority = interiorityRatio >= 0.25 ? "high" : interiorityRatio >= 0.08 ? "moderate" : "low";
	const lines = prose.split(/\r?\n/u);
	const dialogueRatio = lines.filter((line) => line.includes("“")).length / Math.max(lines.length, 1);
	const dialogueCompression = dialogueRatio >= 0.35 ? "high" : dialogueRatio >= 0.15 ? "moderate" : "low";
	const professionalCount = countOf(prose, PROFESSIONAL_TERMS_RE);
	const professionalVocabulary = professionalCount >= 8 ? "high" : professionalCount >= 3 ? "moderate" : "low";
	const emotionLabelCount = countOf(prose, EMOTION_LABEL_RE);
	const emotionLabeling = emotionLabelCount >= 4 ? "high" : emotionLabelCount >= 1 ? "moderate" : "low";
	const detectedAvoidPatterns = profile === undefined ? [] : profile.avoidPatterns.filter((pattern) => prose.includes(pattern));
	return { chapter, sentenceRhythm, interiority, dialogueCompression, professionalVocabulary, emotionLabeling, detectedAvoidPatterns };
}

export function checkVoiceDrift(fingerprint: VoiceFingerprint, profile: VoiceProfile): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	if (fingerprint.detectedAvoidPatterns.length >= 2) findings.push({ code: "VOICE_DRIFT", severity: "warning", message: `本章命中 ${fingerprint.detectedAvoidPatterns.length} 个 voice profile 明确规避的模式（${fingerprint.detectedAvoidPatterns.join("、")}）` });
	const rhythmMismatch = (profile.sentenceRhythm.includes("短") || profile.sentenceRhythm.includes("short")) && fingerprint.sentenceRhythm === "long"
		|| (profile.sentenceRhythm.includes("长") || profile.sentenceRhythm.includes("long")) && fingerprint.sentenceRhythm === "short";
	if (rhythmMismatch) findings.push({ code: "VOICE_DRIFT", severity: "warning", message: `句长节奏偏离 voice profile（profile ${profile.sentenceRhythm} / 本章 ${fingerprint.sentenceRhythm}）；女主突然换了一副嗓子` });
	if (profile.emotionalExplicitness === "low" && fingerprint.emotionLabeling === "high") findings.push({ code: "VOICE_DRIFT", severity: "warning", message: "情绪标签密度偏离 voice profile（克制现实主义 → 情绪外露）；VOICE_DRIFT" });
	return findings;
}
