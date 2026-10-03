# 计算辅助器API 0.1.0

本地已安装Python，固定argv `-B scripts/calculate.py --input-json -`；stdin仅一个UTF-8 JSON对象，stdout仅一个JSON对象。无需第三方依赖。不读取/写入文件、联网、启动子进程或安装。宿主需单独授权执行并提供真实calculationReceipt，不能把本工具当Agent执行或供应商认证。

所有键均严格白名单；schemaVersion必须整数1，quotes必需且1–100项。JSON重复键、未知键、重复supplierId、bool数值、负值、非有限数、指数形式、过长字符串或输入大于262144字节拒绝。数值接受JSON普通十进制number或decimal字符串，最多6位小数、48字符，范围0–10^15；整数字段上限10^9且不接受非整数。输出数值用decimal字符串，展示比率/分数至6位小数；计算全程Decimal，未按币种猜小数精度。错误输出仅固定错误码，不回显原始输入，exit2。

| 根字段 | 定义 |
|---|---|
| quantity | 正整数需求数量，单位含在specification；缺失partial，无法归一 |
| currency / specification | 三位大写币种标识/严格相等规格字符串（<=256字符）；缺失partial，不猜汇率或单位换算 |
| quotes | 报价数组；supplierId必需唯一且<=64字符，缺id非法 |
| weights | 可选，必须cost/delivery/quality三键，非负且和>0；不要求和为1，评分时除以用户权重总和 |
| qualityScale | 可选且严格{definition,minimum,maximum}，definition<=512字符，非负minimum<maximum |
| maxLeadDays | 可选非负整数交期上限，仅筛选leadDays>上限 |
| minimumQualityScore | 可选用户质量下限，必须有qualityScale且在该范围内；低于下限排除 |
| sensitivityDelta | 可选用户相对扰动幅度0<值<1，需要weights；仅对正权重逐项乘(1±delta)，其他权重不变 |

| 每个报价字段 | 定义 |
|---|---|
| supplierId / specification / currency | id必需；报价规格币种缺失或不一致则partial，停止该报价包数/成本归一及全局排名 |
| packSize / minimumPacks | 正整数每包数量/非负整数MOQ包数；MOQ可0，不能默认省略 |
| packPrice / freight / otherFees | 非负包价/本次整个订单运费/本次整个订单其他费用，必须与报价币种相同；明确0与未知省略不同 |
| leadDays | 非负整数报价到货天数；是否含运输、起算点应由角色核对材料 |
| qualityEvidence | 可选非空证据说明<=2000字符，无证据和分数时标记缺项；仅材料声明，未经核验 |
| qualityScore / qualityDefinition | 可选用户分数/定义；分数须在用户尺度内，定义必须与qualityScale.definition逐字相同。缺尺度或定义不一致是partial冲突，不排行 |

除supplierId外报价字段可以省略以产生partial。显式null、错误类型或数值范围非法仍invalid_input；不会把null/省略变0。缺费用时可返回货款小计，但landedTotal/costPerDeliveredUnit为null。仅qualityEvidence没有qualityScore可定性分析，不能进行含正质量权重的评分。

包数=ceil(quantity/packSize)，采购包数=max(包数,minimumPacks)，实收=采购包数×packSize，超购=实收−需求。到货总成本=采购包数×packPrice+freight+otherFees；到货均价=总成本/实收，单位报价=packPrice/packSize。所有费用仅依据用户给值，未声明税费等仍未核实。

硬约束状态为eligible/excluded/unknown；缺约束所需值不视作通过。无用户权重时ranking=null；有权重但任一口径冲突、eligible候选约束未知、正权重需要的成本/交期/分数缺失时不排行，不删掉未知候选来制造胜者，不重分权重。零权重的未知维度保持null、缺项提醒，不阻断其余已知维度评分；该维度候选归一口径不完整时component均null。已知不满足硬约束的候选从评分集合排除；全部排除仍ranking=null。

成本与交期得分=(候选最大值−本值)/(最大值−最小值)，同值时全部1；质量=(qualityScore−尺度minimum)/(maximum−minimum)。总分=Σ用户正权重×维度分/Σ用户权重；0权重维度不参与。缺质量分且质量权重0时component为null而非0。相同精确分数共享dense rank，supplierId仅用于稳定展示，不能用排序位置作为胜负。成本最小是本次总支出，须同时阅读超购和到货均价。

输出根固定schemaVersion/tool/toolVersion/status/normalizedQuotes/ranking/sensitivity/quality/limitations/networkUsed/filesModified。quality.issues说明缺项及定义冲突；certifiedSuppliers恒false。normalizedQuotes保留引用规格、金额、包数、证据、缺项、约束状态；不可比报价comparable=false。ranking数组或null；sensitivity仅在可排行且用户给delta时包含维度/变动权重/各排名。无delta时[]，不编造默认敏感性情景。

status=completed表示给定字段可完成本次核算，不代表证据已核验、可以下单或模型交付通过。缺字段/口径冲突为partial，exit0；非法为invalid_input，exit2。材料充分但缺用户权重，或质量分不支持所给权重时仍可completed且ranking=null，并明确限制。工具不返回tool_unavailable伪回执；宿主不可用时由角色按材料fallback。
