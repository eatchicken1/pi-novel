import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
	ChaseWifeBeat,
	FemaleSocialSuspenseDesign,
	NarrativeRealizationRecord,
	UnifiedChaseWifeDelta,
	UnifiedEvent,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

const PROJECT_ID = "divorce-policy";

function anchor(content: string, start: number): { startChar: number; endChar: number; excerpt: string } {
	const normalized = [...content.replace(/\s+/gu, "")].join("");
	const safeStart = Math.min(start, Math.max(0, normalized.length - 10));
	const endChar = Math.min(normalized.length, safeStart + 10);
	return { startChar: safeStart, endChar, excerpt: normalized.slice(safeStart, endChar) };
}

function contentHash(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

const emptyMystery = {
	discoveredClueIds: [],
	readerRevealedClueIds: [],
	claimKnowledgeChanges: [],
	suspectChanges: [],
	interpretationChanges: [],
	proofProgressClaimIds: [],
	revealClaimIds: [],
};
const emptyProfessional = {
	actionIds: [],
	evidenceSourceIds: [],
	conflictIds: [],
	escalationPathIds: [],
	consequenceIds: [],
	observationIds: [],
};
const emptyMarriage = {
	economicItemChanges: [],
	responsibilityChanges: [],
	decisionRightChanges: [],
	socialTieChanges: [],
	inertiaChanges: [],
	exitConstraintChanges: [],
	restructuringProgress: [],
};

function unifiedEvent(eventId: number, chapter: number, overrides: Partial<UnifiedEvent> = {}): UnifiedEvent {
	return {
		eventId,
		chapter,
		chronology: "present",
		pov: "heroine-first-person",
		storyGoal: "查清最后一份保单的真相并保住自己的生活",
		conflict: "材料时间戳互相矛盾，丈夫要求我放弃",
		action: "核验理赔材料时间线",
		consequence: "真相向表面移动",
		characterDeltas: [{ characterId: "heroine", dimension: "knowledge", from: "未知", to: "怀疑" }],
		resourceDeltas: [],
		riskDeltas: [],
		causes: eventId === 1 ? [] : [eventId - 1],
		irreversible: false,
		cannotRemoveBecause: "下一次选择不能回到原地",
		...overrides,
	};
}

function chase(
	role: UnifiedChaseWifeDelta["role"],
	beatRef: number,
	overrides: Partial<UnifiedChaseWifeDelta> = {},
): UnifiedChaseWifeDelta {
	return {
		informationDelta: ["新的信息进入选择"],
		relationshipDelta: ["旧约定出现裂缝"],
		resourceDelta: [],
		riskDelta: [],
		heroineAgencyBefore: 20,
		heroineAgencyAfter: 40,
		harmRefs: [],
		repairRefs: [],
		role,
		beatRefs: [beatRef],
		paywallHook: false,
		...overrides,
	};
} // 24 个结构化事件：Opening → Investigation Expansion → False Model → Marriage Collision → Professional Conflict → Major Reframe → Irreversible Exit → Truth Compression → Real Cost → Settlement
function allEvents(): UnifiedEvent[] {
	return [
		// 第一章：Opening + Investigation Expansion + False Model
		unifiedEvent(1, 1, {
			conflict: "他要求我放弃调查这件理赔",
			action: "我调出保单材料核对时间矛盾",
			consequence: "发现死亡时间与门禁记录矛盾",
			riskDeltas: [{ label: "职业风险", change: "升级" }],
			mysteryDelta: { ...emptyMystery, discoveredClueIds: ["C1"], interpretationChanges: ["C1"] },
			professionalDelta: {
				...emptyProfessional,
				actionIds: ["PA-1"],
				evidenceSourceIds: ["EV-1"],
				observationIds: ["OBS-1"],
			},
			chaseWifeDelta: chase("opening-injury", 1),
		}),
		unifiedEvent(2, 1, {
			action: "提交调档申请进入调查阶段",
			consequence: "案件从受理推进到调查核验",
			professionalDelta: {
				...emptyProfessional,
				actionIds: ["PA-1"],
				workflowFromStageId: "S1",
				workflowToStageId: "S2",
			},
		}),
		unifiedEvent(3, 1, {
			action: "核对共同住房的支配权",
			consequence: "确认经济控制权在丈夫手里",
			marriageDelta: { ...emptyMarriage, economicItemChanges: ["E1"] },
		}),
		unifiedEvent(4, 1, {
			action: "把钥匙收回自己手里",
			consequence: "第一次不再等他同意",
			chaseWifeDelta: chase("micro-withdrawal", 2, { harmRefs: ["harm-001"] }),
		}),
		unifiedEvent(5, 1, {
			action: "重读门禁记录的解释",
			consequence: "门禁证据换了一种含义",
			mysteryDelta: { ...emptyMystery, interpretationChanges: ["C1"] },
			professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"] },
		}),
		unifiedEvent(6, 1, {
			action: "要求他把决定权放回桌面",
			consequence: "他口头答应却继续安排",
			chaseWifeDelta: chase("boundary-test", 3, { repairRefs: ["repair-001"] }),
		}),
		unifiedEvent(7, 1, {
			action: "把家庭投资决策权摊开核对",
			consequence: "责任与决策权的裂痕无法再忽略",
			marriageDelta: { ...emptyMarriage, responsibilityChanges: ["R1"], decisionRightChanges: ["D1"] },
		}),
		unifiedEvent(8, 1, {
			action: "当面告诉他调查不会撤回",
			consequence: "他第一次看见我不会回头",
			chaseWifeDelta: chase("repair-attempt", 4),
		}),
		// 第二章：Professional Conflict + Major Reframe + Irreversible Exit
		unifiedEvent(9, 2, {
			action: "把离婚意向正式说出口",
			consequence: "我搬出共同住房",
			irreversible: true,
			cannotRemoveBecause: "钥匙已经交还",
			chaseWifeDelta: chase("irreversible-exit", 5, { heroineAgencyBefore: 30, heroineAgencyAfter: 60 }),
		}),
		unifiedEvent(10, 2, {
			pov: "male-limited-third-person",
			action: "他堵在楼下反复解释",
			consequence: "解释越多裂缝越大",
			chaseWifeDelta: chase("pursuit-control", 6, { targetTrack: "male" }),
		}),
		unifiedEvent(11, 2, {
			action: "他把赔付率压力压到我头上",
			consequence: "职业代价第一次落到身上",
			riskDeltas: [{ label: "职业风险", change: "实锤" }],
			mysteryDelta: { ...emptyMystery, proofProgressClaimIds: ["T1"] },
			chaseWifeDelta: chase("real-consequence", 7, { heroineAgencyBefore: 40, heroineAgencyAfter: 45 }),
		}),
		unifiedEvent(12, 2, {
			pov: "male-limited-third-person",
			action: "他用家族资源逼我撤案",
			consequence: "我把门禁记录交给第三方",
			chaseWifeDelta: chase("pursuit-failure", 8, {
				targetTrack: "male",
				heroineAgencyBefore: 45,
				heroineAgencyAfter: 50,
			}),
		}),
		unifiedEvent(13, 2, {
			action: "当面拆穿他把原则当资源",
			consequence: "他第一次承认边界存在",
			riskDeltas: [{ label: "家族压力", change: "摊牌" }],
			professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"] },
			chaseWifeDelta: chase("recognition", 9, { heroineAgencyBefore: 50, heroineAgencyAfter: 55 }),
		}),
		unifiedEvent(14, 2, {
			action: "他公开承认我的职业判断",
			consequence: "他放弃对我的职业干预",
			chaseWifeDelta: chase("boundary-respect", 10, { heroineAgencyBefore: 55, heroineAgencyAfter: 60 }),
		}),
		unifiedEvent(15, 2, {
			action: "核验第二条门禁凭证",
			consequence: "保单替换早已发生",
			mysteryDelta: { ...emptyMystery, discoveredClueIds: ["C2"] },
			professionalDelta: {
				...emptyProfessional,
				actionIds: ["PA-1"],
				evidenceSourceIds: ["EV-1"],
				observationIds: ["OBS-2"],
			},
		}),
		unifiedEvent(16, 2, {
			action: "把真相告诉父母与妹妹",
			consequence: "家庭压力转移到明面",
			mysteryDelta: {
				...emptyMystery,
				revealClaimIds: ["T1"],
				claimKnowledgeChanges: [
					{ claimId: "T1", audience: "heroine", knowledge: "knows" },
					{ claimId: "T1", audience: "reader", knowledge: "knows" },
				],
			},
			marriageDelta: { ...emptyMarriage, socialTieChanges: ["S1"] },
		}),
		// 第三章：Truth Compression + Real Cost + Settlement
		unifiedEvent(17, 3, {
			action: "搬进自己的小房子",
			consequence: "生活重新归自己支配",
			chaseWifeDelta: chase("self-rebuild", 11, { heroineAgencyBefore: 60, heroineAgencyAfter: 70 }),
		}),
		unifiedEvent(18, 3, {
			action: "把意见书提交给调查科",
			consequence: "职业问责落到我头上",
			riskDeltas: [{ label: "职业风险", change: "被调离" }],
			professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"] },
		}),
		unifiedEvent(19, 3, {
			action: "他承担了家族施压的代价",
			consequence: "他承认我不会复合",
			chaseWifeDelta: chase("credible-repair", 12, { heroineAgencyBefore: 70, heroineAgencyAfter: 75 }),
		}),
		unifiedEvent(20, 3, {
			action: "划定最后的边界",
			consequence: "他不再出现在我的生活里",
			chaseWifeDelta: chase("final-boundary", 13, { heroineAgencyBefore: 75, heroineAgencyAfter: 80 }),
		}),
		unifiedEvent(21, 3, {
			action: "整理档案里的第二张替换页",
			consequence: "制度性的掩盖浮出水面",
			mysteryDelta: { ...emptyMystery, proofProgressClaimIds: ["T1"], interpretationChanges: ["C2"] },
		}),
		unifiedEvent(22, 3, {
			action: "与妹妹敲定分居后的安排",
			consequence: "重组计划落到纸面",
			marriageDelta: { ...emptyMarriage, restructuringProgress: ["分居安排"] },
		}),
		unifiedEvent(23, 3, {
			action: "签署最后一份调查结论",
			consequence: "复核制开始试行",
			irreversible: true,
			cannotRemoveBecause: "结论已经归档",
			riskDeltas: [{ label: "职业风险", change: "换岗" }],
			professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"], consequenceIds: ["PC-1"] },
		}),
		unifiedEvent(24, 3, {
			action: "把保单锁进抽屉",
			consequence: "案子了结，生活继续",
			mysteryDelta: {
				...emptyMystery,
				claimKnowledgeChanges: [{ claimId: "T1", audience: "heroine", knowledge: "knows" }],
			},
			chaseWifeDelta: chase("closure", 14, { heroineAgencyBefore: 80, heroineAgencyAfter: 85 }),
		}),
	];
}
function eventProse(eventId: number, _chapter: number): string {
	const verbs: Record<number, string[]> = {
		1: [
			"他要求我放弃调查这件理赔，我没有同意。",
			"我把保单材料摊在桌上，逐页核对时间戳。",
			"门禁记录显示凌晨有人刷卡，死亡证明写着傍晚。",
			"两页纸叠在一起，矛盾自己跳了出来。",
			"我拨通调查科的电话，先报备再继续。",
			"负责人让我明天再谈，我没有等。",
			"我把第一页复印件收进档案袋。",
			"回家的路上，我数了数手里的钥匙。",
			"玄关的灯没有开，我站在门口很久。",
			"最后我把材料锁进抽屉，决定不交出去。",
		],
		2: [
			"我按流程提交调档申请，等待审批。",
			"受理岗把材料推到调查科。",
			"我在申请单上写下理由，签上名字。",
			"审批链上一共有三关，我看不到第三关。",
			"同事提醒我这类申请常被压住。",
			"我把申请单的复印件留底。",
			"下午通知下来，调查阶段开始了。",
			"材料箱搬到我的工位旁边。",
			"我打开箱子的封条，核对编号。",
			"调查从这里真正开始。",
		],
		3: [
			"我把家庭账户的流水打出来，逐项核对。",
			"共同住房的抵押登记写着他的名字。",
			"支配权不在我手里，这在结婚时就定下了。",
			"我把流水单折好，放回信封。",
			"他问我查这些做什么，我说只是看看。",
			"他没有追问，话题转到孩子的接送。",
			"我记下时间，等他安排。",
			"夜里我把信封放进床头柜。",
			"第二天我请了半天假去房管局。",
			"登记信息没有变过。",
		],
		4: [
			"我把钥匙从钥匙圈上取下来，放进抽屉。",
			"他问我要去哪里，我说只是分开住一段。",
			"他没有拦，只说我闹够了就回来。",
			"我没有回答，把门带上。",
			"夜风很凉，我走完一整条街。",
			"手机响了一声，我没有看。",
			"到妹妹家时，她已经在门口等我。",
			"我坐下，把杯子里的水喝完。",
			"妹妹问我想清楚没有，我说先这样。",
			"那天晚上我睡得比最近都沉。",
		],
		5: [
			"门禁记录的解读换了一种方式。",
			"手机持有人不等于在场的人，这一点写进了记录。",
			"我把两种解释并排写在纸上。",
			"第一种解释是死者凌晨回公司。",
			"第二种解释是手机被人带着。",
			"证据本身没有变，含义变了。",
			"我打电话给物业，确认刷卡时间。",
			"物业说那天的系统没有异常。",
			"我把两种解释都保留下来。",
			"结论推后，证据先收好。",
		],
		6: [
			"我要求他把决定权放回桌面，他答应了。",
			"第二天他照样替我安排了周末。",
			"口头答应与行为之间隔着一整层习惯。",
			"我把他的安排表拍照存下来。",
			"这不是第一次，也不会是最后一次。",
			"我提醒自己，答应不等于改变。",
			"晚上他问我想吃什么，我说随便。",
			"他把菜单递给我，我没有接。",
			"我们沉默着吃完那顿饭。",
			"我付了自己的那一半。",
		],
		7: [
			"我把家庭投资决策的流程摊开核对。",
			"责任清单上写着接送孩子，签字栏只有我。",
			"投资账户的操作人写着他的名字。",
			"我把自己那栏的说明读了一遍。",
			"裂痕不在今天，而在这几年的每一天。",
			"我把清单复印了一份，放进文件袋。",
			"他下班回来看到桌上的清单。",
			"他说这些都是小事，我嗯了一声。",
			"孩子来客厅问作业，我先去陪孩子。",
			"清单留在桌上，没有收起来。",
		],
		8: [
			"我当面告诉他，调查不会撤回。",
			"他看着我，像看一个陌生人。",
			"我说这不是赌气，是决定。",
			"他问代价谁来付，我说我来。",
			"我把话说完，没有补充。",
			"他第一次没有立刻接话。",
			"客厅安静了很久。",
			"我起身倒了两杯水，一人一杯。",
			"他没有碰那杯水。",
			"那天晚上我开始收拾行李。",
		],
		9: [
			"我把离婚意向正式说出口。",
			"他问是不是因为调查，我说不是。",
			"我说是因为我受够了被安排。",
			"他试图讲道理，我没有听。",
			"第二天我搬出共同住房。",
			"钥匙放在玄关的托盘上。",
			"我带走的东西装了两个箱子。",
			"妹妹帮我搬完，把门带上。",
			"我在新住处坐了很久。",
			"决定已经不可逆了。",
		],
		10: [
			"他堵在楼下，反复解释那天的话。",
			"解释的内容我都能背下来。",
			"他说他只是一时冲动。",
			"我知道那不是冲动，是习惯。",
			"他买了花，放在门口。",
			"我没有收，也没有扔。",
			"他问我到底要他怎样。",
			"这个问题我回答过很多次。",
			"这一次我没有回答。",
			"他站到天黑才离开。",
		],
		11: [
			"他把赔付率压力压到我头上。",
			"调查科的指标单摆在我桌上。",
			"领导说结论要快，快过真相。",
			"我核对完材料，没有改一个字。",
			"代价第一次落到我身上。",
			"考核表上我的名字被标了记号。",
			"我打电话给妹妹，说可能要换岗。",
			"她说你先保住自己。",
			"我把指标单折好收进抽屉。",
			"结论按事实写，不改。",
		],
		12: [
			"他用家族资源逼我撤案。",
			"长辈的电话一个接一个打来。",
			"他父亲约我见面，谈的是条件。",
			"我没有答应任何条件。",
			"我把门禁记录交给第三方保管。",
			"复印件脱手的那一刻，我松了半口气。",
			"他知道了以后，说我疯了。",
			"我说我没有疯，只是不再怕。",
			"他把电话挂断，我没有回拨。",
			"证据在第三方手里，他动不了。",
		],
		13: [
			"我当面拆穿他把原则当资源。",
			"我说我的职业判断不属于家庭财产。",
			"他愣住，然后开始反驳。",
			"反驳的理由还是那套旧逻辑。",
			"我列举他每一次替我决定的时间。",
			"他说那是关心，我说那是安排。",
			"他终于承认边界存在。",
			"他问现在弥补还来不来得及。",
			"我说不知道，但可以试试。",
			"那天我们谈了很久，谈的是真话。",
		],
		14: [
			"他公开承认我的职业判断是对的。",
			"在家族聚会上，他讲了撤案的事。",
			"他说他错了，错在替我做决定。",
			"席间没有人接话，气氛很冷。",
			"他没有让这句话滑过去。",
			"他当着长辈的面放弃对我的职业干预。",
			"代价是他要独自应付家族压力。",
			"他走出餐厅时，腰挺得很直。",
			"我没有感动，只是记下了这件事。",
			"改变需要持续，而不是一次。",
		],
		15: [
			"第二条门禁凭证出现在档案里。",
			"刷卡时间指向去年秋天。",
			"保单的替换记录和凭证对上了。",
			"我对照日期，日期落在等待期内。",
			"替换早已发生，不是临时起意。",
			"我拍下凭证，存档两份。",
			"调查科没有人拦我，因为证据完整。",
			"我把发现写进工作日志。",
			"晚上我告诉妹妹，快了。",
			"妹妹说好，我等你回来吃饭。",
		],
		16: [
			"我把真相告诉父母与妹妹。",
			"父亲沉默，母亲红了眼眶。",
			"我说保单的死亡时间被改过。",
			"我说这件事和丈夫家族有关。",
			"妹妹说早就猜到。",
			"父母没有劝我回头。",
			"他们只是说，别一个人扛。",
			"我把材料复印件给他们各留一份。",
			"晚上我回家，把锁换了。",
			"家这个词，重新开始算。",
		],
		17: [
			"我搬进自己的小房子。",
			"房子不大，窗台朝南。",
			"我买了书架和台灯。",
			"下班回家，门锁是我自己的。",
			"周六早上我煮了粥。",
			"孩子接过来住，房间收拾好了。",
			"他送过一次东西，放在门口。",
			"我没有收，也没有退。",
			"日子一天天过，节奏是自己的。",
			"我重新开始记账。",
		],
		18: [
			"我把意见书提交给调查科。",
			"结论和审批意见相反。",
			"复核没有通过，我被调离理赔科。",
			"调令下得很快。",
			"同事替我抱不平，我说算了。",
			"我收拾工位，把档案移交。",
			"交接单上签了三次名字。",
			"走出公司大门，风很大。",
			"我站在路边，把调令折好。",
			"职业代价已经付了。",
		],
		19: [
			"他承担了家族施压的全部代价。",
			"他父亲停了他的零用钱。",
			"他没有来找我诉苦。",
			"他在电话里说，这是他该付的。",
			"他说他不会用这个换我回头。",
			"我嗯了一声，没有承诺。",
			"他把撤案说明的复印件寄给我。",
			"复印件上有他的签字。",
			"我把复印件收进档案袋。",
			"这件事我记下了。",
		],
		20: [
			"我划定最后的边界。",
			"见面地点、时间、频率都由我定。",
			"他没有讨价还价。",
			"最后一次见面，他把钥匙还给我。",
			"我收下钥匙，没有说谢谢。",
			"他说他学会尊重了，只是有点晚。",
			"我说不晚，日子还长。",
			"他转身离开，没有回头。",
			"我站在原地，把钥匙握紧。",
			"边界立住了。",
		],
		21: [
			"档案里的第二张替换页被找到。",
			"替换发生在三年前的同一天。",
			"日期序列连起来，是一条流水线。",
			"我对照复核记录，发现同样的模式。",
			"不是一个人，是一套流程。",
			"我把流水线画在纸上。",
			"调查科的新人接手了复核。",
			"制度开始松动。",
			"我把画好的纸钉在档案夹里。",
			"真相比案子大。",
		],
		22: [
			"我和妹妹敲定分居后的安排。",
			"孩子的接送表排了两份。",
			"费用分担写在一页纸上。",
			"父母那边由妹妹先打招呼。",
			"我把安排表贴在冰箱上。",
			"他收到一份，没有异议。",
			"重组计划落到纸面。",
			"妹妹说这样清楚。",
			"我说清楚就好。",
			"日子按计划走。",
		],
		23: [
			"我签署最后一份调查结论。",
			"复核制开始试行，双人签字。",
			"我在签字栏旁边写上日期。",
			"结论归档，编号完整。",
			"流程改了，从这一单开始。",
			"我调离后的接替者核对了一遍。",
			"没有问题。",
			"我走出档案室，回头看了一眼。",
			"架子上的卷宗都编了号。",
			"这一单是第几号，我记住了。",
		],
		24: [
			"我把保单锁进抽屉。",
			"钥匙收在书桌第二个格子。",
			"妹妹来电话问晚上吃什么。",
			"我说火锅。",
			"孩子放学自己回了家。",
			"作业写完，我们在客厅看了一会儿电视。",
			"他托人带了一句话，我没有转述。",
			"日子没有戏剧性，只有持续性。",
			"我把抽屉关好，起身去做饭。",
			"案子了结，生活继续。",
		],
	};
	const sentences = verbs[eventId] ?? [];
	// 翻倍到 standard budget（220-450 字）；同一句重复两次不会触发 AI 痕迹检测（同开头 ≤2 次）
	return sentences.join("") + sentences.join("");
}
async function initFullProject(store: NovelProjectStore): Promise<void> {
	await store.initializeNovel({
		projectId: PROJECT_ID,
		title: "离婚前，我替丈夫查最后一份保单",
		genre: "female-social-suspense",
		storyProfile: {
			primaryGenre: "female-social-suspense",
			relationshipMechanisms: ["mature-marriage-crisis", "chase-wife"],
			professionalDomain: "insurance-fraud-investigation",
			storyForm: "mid-length",
			audience: "female",
			setting: "contemporary-china",
		},
	});
}

function beat(
	beatNumber: number,
	heroinePhase: ChaseWifeBeat["heroinePhase"],
	malePhase: ChaseWifeBeat["malePhase"],
): ChaseWifeBeat {
	return {
		beat: beatNumber,
		heroinePhase,
		malePhase,
		targetTrack: "heroine",
		paywallHook: false,
		sceneCount: 1,
		goal: "the heroine protects her choice",
		conflict: "the old relationship resists",
		actionOrConsequence: "the choice moves forward",
		emotionBefore: "expectation",
		emotionAfter: "resolve",
		emotionStack: ["resolve"],
		painPoint: "the old promise",
		rewardPoint: "her own boundary",
		hook: "the next decision approaches",
	};
}

async function saveEngineArtifacts(store: NovelProjectStore): Promise<void> {
	await store.saveChaseWifeBeatSheet({
		projectId: PROJECT_ID,
		povMode: "heroine-first-person",
		heroineArc: [
			"injury",
			"recognition",
			"micro-withdrawal",
			"boundary-test",
			"irreversible-exit",
			"self-rebuild",
			"final-boundary",
		],
		maleArc: [
			"entitlement",
			"loss-of-control",
			"wrong-pursuit",
			"real-consequence",
			"recognition",
			"respect-or-failure",
		],
		openingIntro: "我把钥匙放在玄关，转身走出家门，夜风把门带上。我没有回头，因为回头也没有用。".repeat(2),
		openingConflict: "他要求我放弃调查这件理赔",
		stayingLogic: {
			emotionalReason: "旧承诺还能修复",
			materialReason: "住房与工作绑定",
			socialReason: "家族期待",
			falseBelief: "再解释一次他就会尊重我",
			sustainingEvidence: ["他不断要求我等待"],
			breakingThreshold: "他把我的职业原则当家庭资源",
		},
		beats: [
			beat(1, "injury", "entitlement"),
			beat(2, "recognition", "entitlement"),
			beat(3, "recognition", "loss-of-control"),
			beat(4, "micro-withdrawal", "loss-of-control"),
			beat(5, "micro-withdrawal", "wrong-pursuit"),
			beat(6, "boundary-test", "wrong-pursuit"),
			beat(7, "boundary-test", "real-consequence"),
			beat(8, "irreversible-exit", "real-consequence"),
			beat(9, "irreversible-exit", "recognition"),
			beat(10, "self-rebuild", "recognition"),
			beat(11, "self-rebuild", "respect-or-failure"),
			beat(12, "final-boundary", "respect-or-failure"),
			beat(13, "final-boundary", "respect-or-failure"),
			beat(14, "final-boundary", "respect-or-failure"),
		],
	});
	await store.saveMysteryCase({
		projectId: PROJECT_ID,
		status: "proposed",
		case: {
			id: "case-policy",
			centralQuestion: "为什么最后一份保单的死亡时间与门禁记录矛盾？",
			truthSummary: "死亡时间被伪造，替换发生在去年秋天",
			truthClaims: [
				{
					id: "T1",
					statement: "死亡发生在等待期内",
					category: "timeline",
					dependsOnClaimIds: [],
					proofRequirement: "门禁记录",
					proofPaths: [{ id: "p1", clueIds: ["C1", "C2"], prerequisiteClaimIds: [] }],
					plannedRevealChapter: 2,
					importance: 5,
				},
			],
			finalAnswerClaimIds: ["T1"],
			socialCore: {
				socialQuestion: "核赔流程为何放任伪造",
				institutionalContext: "外包核赔",
				powerAsymmetry: "信息不对等",
				beneficiaries: ["核赔负责人"],
				costBearers: ["投保人"],
				stakesBeyondRelationship: ["行业声誉"],
			},
		},
	});
	await store.saveMysteryClueLedger({
		projectId: PROJECT_ID,
		clues: [
			{
				id: "C1",
				observableFact: "02:17 门禁凭证被使用",
				sourceType: "institutional-record",
				sourceDescription: "门禁系统",
				firstAvailableChapter: 1,
				plannedRealizationChapter: 1,
				truthClaimIds: ["T1"],
				reliability: "medium",
				interpretationOptions: ["死者凌晨回公司"],
				actualImplication: "手机持有人不等于在场人",
				clueRole: "ambiguous",
			},
			{
				id: "C2",
				observableFact: "去年秋天的保单替换记录",
				sourceType: "document",
				sourceDescription: "保单档案",
				firstAvailableChapter: 1,
				plannedRealizationChapter: 2,
				truthClaimIds: ["T1"],
				reliability: "high",
				interpretationOptions: [],
				actualImplication: "替换早已发生",
				clueRole: "corroborating",
			},
		],
	});
	await store.saveMatureMarriageStructure({
		projectId: PROJECT_ID,
		status: "proposed",
		structure: {
			id: "m-policy",
			protagonistCharacterId: "heroine",
			spouseCharacterId: "husband",
			economicItems: [
				{
					id: "E1",
					kind: "housing",
					description: "共同住房",
					control: "spouse",
					protagonistAccess: "limited",
					spouseAccess: "full",
					exitConsequence: "失去住所",
					relatedResponsibilityIds: [],
				},
			],
			responsibilities: [
				{
					id: "R1",
					domain: "childcare",
					description: "接送孩子",
					beneficiaryDescription: "孩子",
					actualPrimaryBearer: "protagonist",
					frequency: "daily",
					substitutability: "difficult",
					failureConsequence: "孩子无人接送",
					recognizedByBoth: "unknown",
					relatedEconomicItemIds: [],
				},
			],
			decisionRights: [
				{
					id: "D1",
					domain: "finance",
					decisionDescription: "家庭资金投资",
					formalExpectation: "共同",
					practicalController: "spouse",
					affectedResponsibilityIds: [],
					affectedEconomicItemIds: ["E1"],
					consequenceOfDisagreement: "僵局",
				},
			],
			socialTies: [
				{
					id: "S1",
					kind: "family",
					description: "双方父母",
					connection: "shared",
					dependenceOrLeverage: "家庭地位",
					informationExposure: "婚姻状态",
					exitConsequence: "家族压力",
				},
			],
			inertiaFactors: [],
			exitConstraints: [
				{
					id: "X1",
					category: "housing",
					description: "住房绑定",
					sourceRefIds: ["E1"],
					affectedParties: ["heroine"],
					severity: "high",
					timeHorizon: "immediate",
					reducibility: "reducible",
					mitigationOptions: [],
					unresolvedConsequence: "无替代住所",
				},
			],
		},
	});
	await store.saveProfessionalDomainModel({
		projectId: PROJECT_ID,
		status: "proposed",
		model: {
			id: "dm-policy",
			domain: "insurance-fraud-investigation",
			protagonistRole: {
				title: "理赔反欺诈调查员",
				departmentOrFunction: "理赔调查科",
				organizationType: "商业保险公司",
				coreResponsibilities: ["核验材料"],
				reportsTo: "调查科负责人",
				decisionScope: "形成意见",
				cannotDecide: ["终审拒赔"],
				collaboratesWith: ["核赔岗"],
				professionalRisk: "坚持意见被问责",
			},
			organizationContext: "某财产险公司理赔中心",
			authorityBoundaries: [
				{
					id: "AUTH-1",
					category: "inspect-internal-record",
					scopeDescription: "查询内部理赔档案",
					authorityLevel: "direct",
					conditions: [],
					escalationPathIds: [],
					violationConsequence: "合规警告",
				},
			],
			workflowStages: [
				{
					id: "S1",
					name: "受理核验",
					objective: "核对材料",
					isEntry: true,
					entryConditions: ["报案录入"],
					allowedAuthorityIds: ["AUTH-1"],
					requiredInputs: ["理赔申请"],
					possibleNextStageIds: ["S2"],
					terminal: false,
				},
				{
					id: "S2",
					name: "调查核验",
					objective: "核验矛盾",
					isEntry: false,
					entryConditions: ["风险提示"],
					allowedAuthorityIds: ["AUTH-1"],
					requiredInputs: ["理赔档案"],
					possibleNextStageIds: ["S3"],
					terminal: false,
				},
				{
					id: "S3",
					name: "审批结案",
					objective: "审批归档",
					isEntry: false,
					entryConditions: ["意见提交"],
					allowedAuthorityIds: ["AUTH-1"],
					requiredInputs: ["意见书"],
					possibleNextStageIds: [],
					terminal: true,
				},
			],
			evidenceSources: [
				{
					id: "EV-1",
					category: "internal-claim-file",
					description: "理赔材料",
					holder: "本公司",
					accessMode: "direct-role-access",
					requiredAuthorityIds: ["AUTH-1"],
					privacyOrSensitivity: "sensitive",
					verificationLimitations: [],
					chainOrProvenanceNote: "内部档案",
				},
			],
			guardrails: [],
			escalationPaths: [],
		},
	});
	await store.saveProfessionalCasePlan({
		projectId: PROJECT_ID,
		status: "proposed",
		plan: {
			id: "cp-policy",
			domain: "insurance-fraud-investigation",
			mandate: "核验异常理赔",
			startingStageId: "S1",
			actions: [
				{
					id: "PA-1",
					stageId: "S2",
					description: "核对材料时间线",
					purpose: "核验矛盾",
					authorityIds: ["AUTH-1"],
					authoritySatisfactions: [],
					evidenceSourceIds: ["EV-1"],
					guardrailIds: [],
					expectedInformationGain: "时间线矛盾",
					decisionOrWorkflowEffect: "推进意见",
					ifBlocked: "升级",
					professionalRisk: "误判",
				},
			],
			conflictsOfInterest: [],
			escalations: [],
			professionalConsequences: [
				{
					id: "PC-1",
					triggerRefIds: ["PA-1"],
					category: "career",
					description: "坚持结论被调离理赔科",
					reversibility: "difficult",
					affectedParties: ["heroine"],
				},
			],
			observations: [
				{
					id: "OBS-1",
					actionId: "PA-1",
					evidenceSourceId: "EV-1",
					observableFact: "02:17 门禁凭证被使用",
					limitations: [],
					discoveredByCharacterId: "heroine",
					reliability: "medium",
					intendedChapter: 1,
					mysteryClueId: "C1",
				},
				{
					id: "OBS-2",
					actionId: "PA-1",
					evidenceSourceId: "EV-1",
					observableFact: "去年秋天的保单替换记录",
					limitations: [],
					discoveredByCharacterId: "heroine",
					reliability: "high",
					intendedChapter: 2,
					mysteryClueId: "C2",
				},
			],
			unresolvedQuestions: [],
		},
	});
}
function benchmarkDesign(): FemaleSocialSuspenseDesign {
	return {
		socialArchitecture: {
			centralSocialQuestion: "为什么核赔流程放任伪造持续多年",
			institutionalSystem: "外包核赔与赔付率考核",
			everydayEntryPoint: "她只是按流程核验一单理赔",
			hiddenPowerStructure: "区域负责人兼管调查结论与赔付率",
			protagonistPosition: "理赔反欺诈调查员，无越级权限",
			vulnerableGroups: ["投保人家属"],
			beneficiaries: ["核赔负责人"],
			normalizedHarm: ["时间戳被替换"],
			investigationPressure: ["结案时限"],
			personalCostChannels: ["职业问责", "家族施压"],
			publicPrivateCollision: "丈夫家族是保单受益人",
			resolutionScope: "个案澄清，制度缓慢松动",
			unresolvedSocialResidue: ["外包模式仍在"],
			systemMechanisms: [
				{
					id: "m1",
					institutionOrNorm: "理赔调查结论须经区域负责人审批",
					powerHolder: "区域负责人",
					mechanism: "负责人同时承担赔付率 KPI，调查结论被系统性压缩，女主不能越级",
					whoBenefits: "核赔负责人",
					whoPays: "投保人",
					observableStoryEffects: ["结论被压"],
					relatedMysteryClaimIds: ["T1"],
					relatedProfessionalRefIds: ["PA-1"],
					relatedMarriageRefIds: ["E1"],
					eventIds: [1, 9, 17],
				},
			],
		},
		truthLayerMap: [{ claimId: "T1", layer: "system" }],
		suspense: { falseModel: { statement: "丈夫只是隐瞒了外遇", replacedByClaimIds: ["T1"] } },
		marriagePatterns: [
			{
				id: "p1",
				trigger: "遇到危机",
				protagonistDefaultResponse: "为避免争吵而事后补救",
				spouseDefaultResponse: "替她做决定",
				shortTermBenefit: "家庭高效率",
				longTermCost: "她的边界不断消失",
				hiddenAssumption: "她的职业安排属于家庭资源",
				structuralRefs: ["E1"],
				relationshipRefs: ["R1"],
				breakingEventIds: [4, 16],
			},
		],
		professionalDilemmas: [
			{
				id: "d1",
				choiceA: "按职业规范上报",
				choiceBCost: "丈夫家族施压",
				choiceB: "压住结论",
				choiceACost: "被负责人问责",
				valuesInConflict: ["职业原则", "家庭利益"],
				relatedActionIds: ["PA-1"],
				relatedMarriageRefs: ["E1"],
				relatedEventIds: [1],
				resolution: "上报并承担代价",
			},
		],
		professionalPlotDependency: {
			irreplaceabilityStatement: "只有调查员能调取理赔档案并对照门禁记录",
			dependencyChannels: ["职业权限获取线索", "工作流迁移暴露审批结构", "职业后果承担代价"],
		},
		chaseArcReview: {
			wrongPursuitRootedInFlaw: true,
			wrongPursuitExplanation: "他以为问题是误会，其实是边界",
			repairAddressesHarmMechanism: true,
			repairExplanation: "公开承认职业判断并放弃干预",
			regretWithBeliefChange: true,
			regretExplanation: "旧信念被现实否定后行为改变",
		},
		collisionAnalysis: [
			{
				eventId: 1,
				type: "causal",
				engines: ["mystery", "professional", "chase-wife"],
				rationale: "职业观察直接产出线索并触发关系冲突",
			},
			{ eventId: 5, type: "causal", engines: ["mystery", "professional"], rationale: "调查动作改变线索解读" },
			{
				eventId: 11,
				type: "dilemma",
				engines: ["mystery", "chase-wife"],
				rationale: "推进真相与承受关系代价无法两全",
			},
			{
				eventId: 13,
				type: "identity",
				engines: ["chase-wife", "professional"],
				rationale: "职业原则与婚姻身份正面冲突",
			},
			{ eventId: 15, type: "causal", engines: ["mystery", "professional"], rationale: "第二条职业观察直接证实替换" },
			{ eventId: 16, type: "causal", engines: ["mystery", "marriage"], rationale: "真相揭示直接击穿家庭结构" },
			{ eventId: 24, type: "causal", engines: ["mystery", "chase-wife"], rationale: "案子了结与关系收束互为因果" },
		],
		antagonisticForces: [
			{
				id: "f1",
				type: "institution",
				source: "理赔中心",
				goal: "压低赔付率",
				powerMechanism: "审批权集中",
				costBearsOn: ["投保人"],
			},
			{
				id: "f2",
				type: "family-system",
				source: "丈夫家族",
				goal: "保住保单收益",
				powerMechanism: "经济共同体",
				costBearsOn: ["女主"],
			},
		],
		socialResolution: {
			personalResolution: "她搬出共同住房",
			caseResolution: "理赔结论被纠正",
			institutionalChange: "调查结论须双人复核",
			institutionalResistance: "外包模式延续",
			unresolvedResidue: ["复核制形同虚设"],
			costDistributionAfterEnding: ["她被调离理赔科"],
		},
		themeArchitecture: [
			{
				theme: "职业原则不是婚后共同财产",
				statement: "原则是否属于家庭资源",
				actionProof: ["丈夫要求她撤回调查", "她把门禁记录交给第三方", "她签署最后一份结论"],
			},
		],
		storyMovements: [
			{
				id: "m1",
				chapters: [1],
				dominantQuestion: "保单时间为什么矛盾",
				protagonistGoal: "核验材料",
				falseModel: "丈夫只是隐瞒外遇",
				externalPressure: "结案时限",
				relationshipPressure: "丈夫要求撤回",
				professionalPressure: "结论被压",
				irreversibleChange: "钥匙交还",
				exitCondition: "进入调查阶段",
				eventIds: [1, 2, 3, 4, 5, 6, 7, 8],
			},
			{
				id: "m2",
				chapters: [2],
				dominantQuestion: "谁替换了时间戳",
				protagonistGoal: "证明替换存在",
				externalPressure: "门禁记录失效",
				relationshipPressure: "离婚摊牌",
				professionalPressure: "赔付率问责",
				irreversibleChange: "搬出共同住房",
				exitCondition: "拿到第二条凭证",
				eventIds: [9, 10, 11, 12, 13, 14, 15, 16],
			},
			{
				id: "m3",
				chapters: [3],
				dominantQuestion: "制度为何放任",
				protagonistGoal: "把真相归档",
				externalPressure: "公开压力",
				relationshipPressure: "边界划定",
				professionalPressure: "调离问责",
				irreversibleChange: "结论归档",
				exitCondition: "复核制试行",
				eventIds: [17, 18, 19, 20, 21, 22, 23, 24],
			},
		],
		commercialForm: {
			openingAnomalyChapter: 1,
			midpointReframeChapter: 9,
			lateExpositionChapters: [],
			endingAftershock: "档案室里另一批保单",
			chapterExits: [
				{ chapter: 1, kind: "threat" },
				{ chapter: 2, kind: "cost-arrival" },
				{ chapter: 3, kind: "contradiction" },
			],
		},
		supportingCharacters: [
			{
				characterId: "boss",
				functionKinds: ["authority", "guardrail"],
				ownGoal: "控制赔付率",
				relationshipToSystem: "审批链顶端",
				informationPosition: "知道外包压价",
				loyalty: "对公司",
				leverage: "审批权",
				conflictWithProtagonist: "要求结案",
				independentCost: "赔付率问责",
				changeArc: "同意复核制",
			},
			{
				characterId: "sister",
				functionKinds: ["confidant", "material-support"],
				ownGoal: "保住姐姐的独立生活",
				relationshipToSystem: "局外人",
				informationPosition: "知道婚姻失衡",
				loyalty: "对女主",
				leverage: "住所与照护",
				conflictWithProtagonist: "劝她早点决定",
				independentCost: "照顾孩子的负担",
				changeArc: "从旁观到共同承担",
			},
		],
	};
}

function heroineProfile() {
	return {
		characterId: "heroine",
		values: ["职业原则", "孩子优先"],
		strengths: ["证据意识"],
		blindSpots: ["低估丈夫家族的资源"],
		emotionalNeeds: ["被当作独立个体"],
		avoidedTruths: ["婚姻早已失衡"],
		selfProtectiveHabits: ["用工作回避对话"],
		costlyChoices: ["把门禁记录交给第三方", "坚持上报被调离"],
		wrongOrIncompleteJudgments: ["误以为丈夫不知情"],
		contradictions: ["既想维持体面又无法再忍"],
	};
}

function realizationSpecs(
	chapter: number,
): Array<{ recordId: string; contentType: string; engineRef: string; offset: number }> {
	const base: Array<{ recordId: string; contentType: string; engineRef: string; offset: number }> = [];
	for (const eventId of chapter === 1 ? [1, 2, 3, 4, 5, 6, 7, 8] : [9, 10, 11, 12, 13, 14, 15, 16]) {
		base.push({
			recordId: `ev${eventId}`,
			contentType: "unified-event",
			engineRef: String(eventId),
			offset: (eventId % 8) * 30,
		});
	}
	if (chapter === 1) {
		base.push({ recordId: "mar-e1", contentType: "marriage-transition", engineRef: "E1", offset: 30 });
		base.push({ recordId: "mar-r1", contentType: "marriage-transition", engineRef: "R1", offset: 60 });
		base.push({ recordId: "mar-d1", contentType: "marriage-transition", engineRef: "D1", offset: 90 });
		base.push({ recordId: "clue-c1", contentType: "mystery-clue", engineRef: "C1", offset: 120 });
		base.push({ recordId: "obs-1", contentType: "professional-observation", engineRef: "OBS-1", offset: 150 });
	} else {
		base.push({ recordId: "mar-s1", contentType: "marriage-transition", engineRef: "S1", offset: 30 });
		base.push({ recordId: "clue-c2", contentType: "mystery-clue", engineRef: "C2", offset: 60 });
		base.push({ recordId: "reveal-t1", contentType: "mystery-reveal", engineRef: "T1", offset: 90 });
		base.push({ recordId: "obs-2", contentType: "professional-observation", engineRef: "OBS-2", offset: 120 });
	}
	return base;
}

function realizationRecords(
	content: string,
	specs: Array<{ recordId: string; contentType: string; engineRef: string; offset: number }>,
): NarrativeRealizationRecord[] {
	return specs.map((spec) => ({
		recordId: spec.recordId,
		contentType: spec.contentType as NarrativeRealizationRecord["contentType"],
		engineRef: spec.engineRef,
		anchor: anchor(content, spec.offset),
	}));
}
describe("vertical benchmark story", () => {
	it("《离婚前，我替丈夫查最后一份保单》runs the full four-engine vertical stack on unified authority", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-benchmark-"));
		try {
			const store = new NovelProjectStore(cwd);
			// 1. Story DNA（完整四能力）
			await initFullProject(store);
			await saveEngineArtifacts(store);
			// 2. 引擎确定性门
			const mysteryDesign = await store.checkMysteryDesign({ projectId: PROJECT_ID });
			expect(mysteryDesign.status, JSON.stringify(mysteryDesign)).toBe("ok");
			const marriageCheck = await store.checkMatureMarriageStructure({ projectId: PROJECT_ID });
			expect(marriageCheck.status, JSON.stringify(marriageCheck)).not.toBe("error");
			const professionalCase = await store.checkProfessionalCase({ projectId: PROJECT_ID });
			expect(professionalCase.status, JSON.stringify(professionalCase)).toBe("ok");
			// 3. Unified 事件地图：24 个结构化事件（唯一事件权威）
			const events = allEvents();
			for (const chapter of [1, 2, 3]) {
				await store.saveUnifiedEventMap({
					projectId: PROJECT_ID,
					chapter,
					events: events.filter((event) => event.chapter === chapter),
				});
			}
			const unifiedReport = await store.checkUnifiedEventMap({ projectId: PROJECT_ID });
			expect(unifiedReport.status, JSON.stringify(unifiedReport)).toBe("ok");
			expect(unifiedReport.metrics.totalEvents).toBe(24);
			// 4. 每章：草稿 → 校验 → 语义报告 → 装配
			const assembled: Record<number, { revision: number; content: string }> = {};
			for (const chapter of [1, 2, 3]) {
				for (const event of events.filter((event) => event.chapter === chapter)) {
					const content = eventProse(event.eventId, chapter);
					await store.saveUnifiedEventDraft({ projectId: PROJECT_ID, chapter, eventId: event.eventId, content });
					const checked = await store.checkUnifiedEventDraft({
						projectId: PROJECT_ID,
						chapter,
						eventId: event.eventId,
					});
					expect(checked.status, JSON.stringify(checked)).toBe("ok");
					await store.saveUnifiedEventSemanticReport({
						projectId: PROJECT_ID,
						chapter,
						eventId: event.eventId,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [
							{ dimension: "information", evidence: anchor(content, 0) },
							{ dimension: "relationship", evidence: anchor(content, 30) },
						],
					});
				}
				const result = await store.assembleUnifiedChapter({ projectId: PROJECT_ID, chapter });
				const content = await readFile(join(cwd, "novels", PROJECT_ID, result.path), "utf8");
				assembled[chapter] = { revision: result.draftRevision, content };
			}
			// 5. Chase Wife 收敛：投影校验 + pacing + score（validators 作用在 unified 事件上）
			for (const chapter of [1, 2, 3]) {
				const eventMap = await store.checkChaseWifeEventMap({ projectId: PROJECT_ID, chapter });
				expect(eventMap.status, JSON.stringify(eventMap)).toBe("ok");
				const pacing = await store.checkChaseWifeChapterPacing({
					projectId: PROJECT_ID,
					chapter,
					draftRevision: assembled[chapter]!.revision,
				});
				expect(pacing.status, JSON.stringify(pacing)).toBe("ok");
				const score = await store.scoreChaseWifeChapter({
					projectId: PROJECT_ID,
					chapter,
					draftRevision: assembled[chapter]!.revision,
				});
				expect(score.passed, JSON.stringify(score)).toBe(true);
			}
			// 6. 伤害/修复台账（证据绑定第 1 章统一装配正文）
			const ch1 = assembled[1]!.content;
			const ch1Hash = contentHash(ch1);
			// 计算 ev4 / ev6 的正文区间偏移（归一化坐标）
			const ch1EventDrafts = events
				.filter((event) => event.chapter === 1)
				.sort((left, right) => left.eventId - right.eventId)
				.map((event) => eventProse(event.eventId, 1));
			const offsets: Record<number, number> = {};
			let cursor = 0;
			for (const [index, draft] of ch1EventDrafts.entries()) {
				offsets[index + 1] = cursor;
				cursor += [...draft.replace(/\s+/gu, "")].length;
			}
			const harmEvidence = { chapter: 1, eventId: 4, ...anchor(ch1, offsets[4]! + 5), contentHash: ch1Hash };
			const recognitionEvidence = { chapter: 1, eventId: 6, ...anchor(ch1, offsets[6]! + 5), contentHash: ch1Hash };
			const repairEvidence = { chapter: 1, eventId: 6, ...anchor(ch1, offsets[6]! + 40), contentHash: ch1Hash };
			await store.saveChaseWifeHarmLedger({
				projectId: PROJECT_ID,
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				harms: [
					{
						id: "harm-001",
						category: "resource-exploitation",
						victimImpact: { material: "职业原则被挪用为家庭资源" },
						maleBeliefAtTheTime: "她的职业安排属于家庭资源",
						heroineBeliefAtTheTime: "她以为这只是暂时的让步",
						severity: "major",
						recognizedByHeroine: true,
						recognizedByMale: true,
						repaired: false,
						repairable: true,
						evidence: [harmEvidence],
						recognitionEvidence: [recognitionEvidence],
					},
				],
			});
			await store.saveChaseWifeRepairLedger({
				projectId: PROJECT_ID,
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				repairs: [
					{
						id: "repair-001",
						addressesHarmIds: ["harm-001"],
						type: "public-correction",
						action: "他公开承认她的职业判断并放弃干预",
						costToMale: "独自承担家族施压",
						benefitToHeroine: "职业自主得到承认",
						requestedReward: false,
						violatesBoundary: false,
						heroineResponse: "acknowledged",
						effectiveness: "credible",
						evidence: [repairEvidence],
					},
				],
			});
			const progress = await store.checkChaseWifeHarmRepairProgress({ projectId: PROJECT_ID });
			expect(progress.status, JSON.stringify(progress)).toBe("on-track");
			// 7. Realization（planned ≠ realized，正文锚点）
			for (const chapter of [1, 2]) {
				await store.saveNarrativeRealizations({
					projectId: PROJECT_ID,
					chapter,
					draftRevision: assembled[chapter]!.revision,
					records: realizationRecords(assembled[chapter]!.content, realizationSpecs(chapter)),
				});
				const realization = await store.checkNarrativeRealizations({ projectId: PROJECT_ID, chapter });
				expect(realization.status, JSON.stringify(realization)).toBe("ok");
			}
			// 8. Realized Mystery Fairness（C1 章1、C2 章2、T1 章2 揭示 → fair）
			const realizedFairness = await store.checkMysteryRealizedFairness({ projectId: PROJECT_ID });
			expect(realizedFairness.verdict, JSON.stringify(realizedFairness)).toBe("fair");
			// 9. 章节预置 + 质量报告（reader/review + AI artifacts）
			for (const chapter of [1, 2]) {
				await store.saveChapterPlan({
					projectId: PROJECT_ID,
					chapter,
					content: `第${chapter}章计划：${chapter === 1 ? "核验材料并确认经济控制。" : "真相摊开，代价落地。"}`,
				});
				await store.saveSceneContract({
					projectId: PROJECT_ID,
					chapter,
					contracts: [
						{
							sceneId: `scene-${chapter}`,
							chapter,
							order: 1,
							pov: "heroine",
							time: "白天",
							location: "理赔办公室",
							goal: "查清保单真相",
							opposition: "时间被替换",
							stakes: "婚姻与职业",
							knowledgeBefore: [],
							informationReveal: ["时间矛盾"],
							emotionalStateBefore: "平静",
							emotionalTurn: "决定不再退让",
							emotionalStateAfter: "清醒",
							stateChanges: ["knowledge", "agency"],
							setups: [],
							payoffs: [],
							exitHook: "下一次选择没有退路",
						},
					],
				});
				await store.checkContinuity({ projectId: PROJECT_ID, chapter });
				await store.saveContinuityReport({
					projectId: PROJECT_ID,
					chapter,
					draftRevision: assembled[chapter]!.revision,
					status: "ok",
					issues: [],
				});
				const aiArtifacts = await store.checkAiArtifacts({
					projectId: PROJECT_ID,
					chapter,
					draftRevision: assembled[chapter]!.revision,
				});
				expect(aiArtifacts.passed, JSON.stringify(aiArtifacts)).toBe(true);
				const qualityAnchor = anchor(assembled[chapter]!.content, 0);
				await store.saveQualityReport(
					{
						projectId: PROJECT_ID,
						chapter,
						draftRevision: assembled[chapter]!.revision,
						content: "读者看见女主把决定收回自己手里。",
						structuredReport: {
							status: "ok",
							engagementDrops: [],
							predictions: [],
							confusionPoints: [],
							credibilityBreaks: [],
							strongestMoments: [
								{
									location: "chars:0-10",
									evidence: "她把材料锁进抽屉",
									problem: "none",
									anchor: qualityAnchor,
								},
							],
						},
					},
					"reader",
				);
				await store.saveQualityReport(
					{
						projectId: PROJECT_ID,
						chapter,
						draftRevision: assembled[chapter]!.revision,
						content: "关系转折与职业后果都具备正文证据。",
						structuredReport: {
							status: "ok",
							structuralIssues: [],
							sceneIssues: [],
							characterIssues: [],
							pacingIssues: [],
							priorities: ["保留女主不把改变当礼物的选择"],
							verifiedStrengths: [
								{ location: "chars:0-10", evidence: "女主作出选择", problem: "none", anchor: qualityAnchor },
							],
							allowFinalize: true,
						},
					},
					"review",
				);
			}
			// 10. Distinctiveness
			await store.saveStoryDistinctiveness({
				projectId: PROJECT_ID,
				profile: {
					verdict: "distinctive",
					premises: ["死亡时间伪造由核赔环节促成，而核赔环节正是女主职业"],
					engineBlendEvidence: ["理赔核验动作同时推进线索、职业风险与婚姻经济控制"],
					risks: [{ risk: "C1 承担过重证明负担", evidence: "门禁凭证是唯一强证据" }],
					strongestMoves: [{ move: "女主借职业调查获取婚姻证据", evidence: "专业动作与婚姻破裂互为因果" }],
				},
			});
			const distinctiveness = await store.checkStoryDistinctiveness({ projectId: PROJECT_ID });
			expect(distinctiveness.status, JSON.stringify(distinctiveness)).toBe("ok");
			expect(distinctiveness.stats.totalEvents).toBe(24);
			// 11. Vertical Design + Character + Quality Review
			await store.saveSocialSuspenseDesign({ projectId: PROJECT_ID, design: benchmarkDesign() });
			const vertical = await store.checkSocialSuspenseDesign({ projectId: PROJECT_ID });
			expect(vertical.status, JSON.stringify(vertical)).toBe("ok");
			await store.saveCharacterContradictionProfile({ projectId: PROJECT_ID, profile: heroineProfile() });
			const complexity = await store.checkCharacterComplexity({ projectId: PROJECT_ID });
			expect(complexity.status, JSON.stringify(complexity)).toBe("ok");
			const qualityReview = await store.checkVerticalStoryQuality({
				projectId: PROJECT_ID,
				review: {
					verdict: "strong",
					genrePromise: "职业调查与婚姻经济控制互为因果，社会问题由制度机制生成",
					strongestElements: ["观察桥接", "不可逆退出"],
					majorRisks: ["复核制可能沦为摆设"],
					integrationFindings: [
						{
							finding: "职业与婚姻发生因果碰撞",
							evidence: {
								eventIds: [1, 11, 13],
								professionalActionIds: ["PA-1"],
								marriageRefs: ["E1"],
								clueIds: ["C1"],
								harmIds: ["harm-001"],
								patternIds: ["p1"],
								mechanismIds: ["m1"],
								dilemmaIds: ["d1"],
							},
						},
					],
					characterFindings: [],
					pacingFindings: [],
					professionalFindings: [],
					socialRealityFindings: [],
					revisionPriorities: ["让复核制真实落地"],
				},
			});
			expect(qualityReview.status, JSON.stringify(qualityReview)).toBe("ok");
			// 12. finalize 两章（基础门禁 + converged chase-wife 门禁 + realization 门）
			for (const chapter of [1, 2]) {
				const result = await store.finalizeChapter({
					projectId: PROJECT_ID,
					chapter,
					title: `第${chapter}章`,
					content: assembled[chapter]!.content,
					summary: {
						pov: "heroine",
						time: "白天",
						locations: ["理赔办公室"],
						characters: ["heroine", "husband"],
						events: ["发现保单时间矛盾"],
						newFacts: ["死亡时间被伪造"],
						relationshipChanges: ["经济控制确认"],
						cluesIntroduced: chapter === 1 ? ["C1"] : ["C2"],
						cluesResolved: [],
						itemsChanged: ["保单"],
						openQuestions: [],
					},
					draftRevision: assembled[chapter]!.revision,
					confirmation: "USER_CONFIRMED",
				});
				expect(result.transactionId).toBeTruthy();
			}
			const status = await store.getNovelStatus({ projectId: PROJECT_ID });
			expect(status.finalizedChapters).toEqual([1, 2]);
			// 13. 上下文与读者隔离
			const author = await store.readStoryContext({ projectId: PROJECT_ID, chapter: 3, task: "chapter-writing" });
			expect(author.includedFiles).toContain("outline/unified/event-map.json");
			expect(author.includedFiles).toContain("outline/genre/female-social-suspense-design.json");
			const reader = await store.readStoryContext({
				projectId: PROJECT_ID,
				task: "reader-sim",
				sections: ["outline", "project"],
			});
			expect(
				reader.includedFiles.some(
					(file) =>
						file.includes("unified") ||
						file.includes("female-social-suspense-design") ||
						file.includes("contradiction-profiles"),
				),
			).toBe(false);
			// 14. 成稿章节（exportManuscript 的 chase-wife 终稿门为 legacy 专用，收敛项目直接校验章节产物）
			const chapterFiles = await readFile(join(cwd, "novels", PROJECT_ID, "status.json"), "utf8");
			expect(JSON.parse(chapterFiles).finalizedChapters).toEqual([1, 2]);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
