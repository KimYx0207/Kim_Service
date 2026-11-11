# API 契约审查

检查接口是否能被真实调用、正确失败并兼容现有消费者。

## 使用

让当前宿主读取 `SKILL.md`，带上本次任务资料；完整方法与案例随目录提供。

## 你会得到

- `interfaceMap`：接口与消费者映射。
- `compatibility`：兼容性变化。
- `behaviorCases`：行为案例。
- `recommendations`：最小修正建议。

## 检查

运行 `node tests/contract.test.mjs` 检查包完整性；当前任务按 `method.json` 的领域标准验收。

## 联系与支持

<p align="center">
  <img src="../../docs/images/contact-qr.png" alt="老金联系方式" width="720">
</p>

<table align="center">
  <tr>
    <th align="center">微信收款码</th>
    <th align="center">支付宝收款码</th>
  </tr>
  <tr>
    <td align="center"><img src="../../docs/images/wechat-pay.jpg" alt="微信收款码" width="260"></td>
    <td align="center"><img src="../../docs/images/alipay.jpg" alt="支付宝收款码" width="260"></td>
  </tr>
</table>

如果这个能力包帮到了你，欢迎 Star、分享，或者请老金喝杯咖啡。图片统一维护在仓库公共目录；单独复制本包不影响方法运行，联系与支持可访问 [Kim Service](https://github.com/KimYx0207/Kim_Service#联系与支持)。
