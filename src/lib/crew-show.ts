/**
 * Thông tin SHOW gắn vào một phân công thợ — studio gán gì thì thợ thấy đúng
 * thế trên lịch và trong tin Zalo.
 */

export const CREW_TASK_LABEL: Record<string, string> = {
  chup: "Chụp",
  quay: "Quay",
  both: "Chụp + Quay",
};

export const CREW_SIDE_LABEL: Record<string, string> = {
  trai: "Nhà trai",
  gai: "Nhà gái",
  later: "Sắp xếp sau",
};

export const CREW_TASKS = ["chup", "quay", "both"] as const;
export const CREW_SIDES = ["trai", "gai", "later"] as const;

/**
 * Một dòng mô tả buổi làm cho thợ: "Cưới Minh & Lan · Chụp · Nhà gái".
 * Bỏ qua phần nào studio chưa gán, không đẻ ra dấu chấm thừa.
 */
export function showLabel(opts: {
  title?: string | null;
  task?: string | null;
  side?: string | null;
}): string {
  return [
    opts.title?.trim() || null,
    opts.task ? CREW_TASK_LABEL[opts.task] ?? null : null,
    opts.side ? CREW_SIDE_LABEL[opts.side] ?? null : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
