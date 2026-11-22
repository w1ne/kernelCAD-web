import { readFileSync } from 'node:fs';
const vendor = import(process.env.KC_BUNDLE);
const hwm = () => Number(/VmHWM:\s+(\d+)/.exec(readFileSync('/proc/self/status', 'utf8'))[1]) / 1024;
process.on('message', async (m) => {
  try {
    const { callMcpTool } = await vendor;
    const value = m.name === '__load' ? null : await callMcpTool(m.name, m.args);
    process.send({ id: m.id, ok: true, value, hwmMb: hwm(), heapMb: process.memoryUsage().heapUsed / 1048576 });
  } catch (e) {
    process.send({ id: m.id, ok: false, error: String(e?.stack ?? e), hwmMb: hwm() });
  }
});
process.on('disconnect', () => process.exit(0));
