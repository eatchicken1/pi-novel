# 经济单元与照护责任

## Economic Entanglement

婚姻经济纠缠不只 asset/debt 两项，统一用 MarriageEconomicItem：kind（housing/asset/debt/income-stream/recurring-expense/business-interest/family-transfer/benefit/other）、control（protagonist/spouse/shared/third-party/unknown）、protagonistAccess/spouseAccess（full/limited/none/unknown）、liquidity、exitConsequence（退出后此项会怎样）、ongoingBurden、relatedResponsibilityIds。

- 不要试图自动判断“法律上房子属于谁”：legalOrOwnershipNarrative 只是作者提供的故事事实，不是系统法律推断；
- 每条经济项都必须写出 exitConsequence（保持现状会怎样、拆分会怎样）。

## Care / Domestic / Family Responsibility

MarriageResponsibility：domain（domestic/childcare/eldercare/financial/health-care/family-administration/career-support/social-maintenance/emotional-labor/other）、expectedAllocation vs actualPrimaryBearer（预期分配 vs 实际承担者）、backupBearer、frequency（daily/weekly/recurring/episodic/crisis-only）、substitutability（easy/difficult/none/unknown）、failureConsequence、recognizedByBoth、relatedEconomicItemIds。

## Care Work ≠ Harm（硬边界）

- “女主做家务较多”“照顾患病老人”只是结构事实；
- 只有 Chase Wife Harm Ledger 能表达 care-labor-exploitation，且需要正文与关系语义进一步证明（强制、剥夺退出权、拒绝补偿、同时转移资源等）；
- 结构 checker 最多给出 CARE_LOAD_ASYMMETRY warning，不自动创建 harm、不自动判 abusive、不自动判 relationship-breaking。

## 描述规则

每条责任回答：谁做什么、为什么必须做、谁依赖这项劳动、如果停止会发生什么（failureConsequence）。
