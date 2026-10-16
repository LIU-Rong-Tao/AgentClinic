export const therapists = [
  { id: 'ada', name: 'Dr. Ada' },
  { id: 'turing', name: 'Dr. Turing' },
  { id: 'hopper', name: 'Dr. Hopper' },
];

export function parseShanghaiSlot(
  date: string,
  time: string,
): number | undefined {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(time)
  )
    return;
  if (Number(date.slice(0, 4)) < 1000) return;
  const ms = Date.parse(`${date}T${time}:00+08:00`);
  if (!Number.isFinite(ms)) return;
  // 往返验证避免 JavaScript 将不存在的日期自动滚到下个月。
  if (
    new Date(ms + 8 * 3600000).toISOString().slice(0, 16) !== `${date}T${time}`
  )
    return;
  return ms / 1000;
}

export function formatShanghaiSlot(seconds: number) {
  return (
    new Date((seconds + 8 * 3600) * 1000)
      .toISOString()
      .slice(0, 16)
      .replace('T', ' ') + '（Asia/Shanghai，30 分钟）'
  );
}

export function appointmentState(
  status: string,
  startsAt: number,
  nowMs: number,
) {
  if (status === 'cancelled') return 'cancelled';
  // 保留旧版已人工完成的历史记录，不重新激活。
  if (status === 'completed' || nowMs >= (startsAt + 1800) * 1000)
    return 'ended';
  return nowMs >= startsAt * 1000 ? 'ongoing' : 'scheduled';
}
export const appointmentLabels = {
  scheduled: '待开始',
  ongoing: '进行中',
  ended: '已结束',
  cancelled: '已取消',
};
