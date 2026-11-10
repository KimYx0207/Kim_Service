# 游戏机制与试玩研究

用明确的机制与观察任务检验玩家体验假设，区分设计意图、实际行为、可复现问题和下一轮调整。

## 使用

复制完整目录后，让当前宿主读取 `SKILL.md`，提供 `capability.json` 声明的输入。方法、模板和作者反例随包携带；工具权限由宿主绑定。

## 交付

- 体验到机制和状态的映射。
- 围绕设计问题的试玩任务。
- 真实行为与证据分层。
- 机制/数值调整与后续验证。
- 当前输入、来源、期间单位及证据缺口。
- 未执行、未观察、方法假设和外推边界。
- 当前产物、规则结果、证据定位与待解决事项交调用方。

## 验证与范围

运行 `node tests/contract.test.mjs` 检查独立包完整性。规则需结合真实产物和独立评审执行；本包保持 `needs_probe` 和 `professionalEffect: not_evaluated`。

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
