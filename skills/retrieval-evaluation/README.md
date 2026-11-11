# 检索质量评估

用独立标注和固定语料判断检索是否找到了相关材料，区分召回、排序与答案质量。

## 使用

让当前宿主读取 `SKILL.md`，带上本次任务资料；完整方法与案例随目录提供。

## 你会得到

- `metrics`：召回与排序指标。
- `slices`：分层和回归结果。
- `diagnosis`：错误归因。
- `nextExperiment`：下次试验。

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
