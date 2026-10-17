/**
 * 生日倒计时 - 数据访问层
 * ------------------------------------------------------------
 * 薄封装 db.birthdays，集中放置 CRUD 与字段输入类型。
 */
import { db, type Birthday } from '@/core/db'

export type { Birthday } from '@/core/db'

export interface BirthdayInput {
  name: string
  relation: string
  isLunar: boolean
  birthday: string
  remindAdvance: number
  notes?: string
}

export async function listBirthdays(): Promise<Birthday[]> {
  const all = await db.birthdays.toArray()
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function getBirthday(id: number): Promise<Birthday | undefined> {
  return db.birthdays.get(id)
}

export async function addBirthday(input: BirthdayInput): Promise<number> {
  const now = Date.now()
  return db.birthdays.add({
    name: input.name,
    relation: input.relation,
    isLunar: input.isLunar,
    birthday: input.birthday,
    remindAdvance: input.remindAdvance,
    notes: input.notes,
    createdAt: now,
    updatedAt: now
  })
}

export async function updateBirthday(id: number, patch: Partial<Birthday>): Promise<void> {
  await db.birthdays.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteBirthday(id: number): Promise<void> {
  await db.birthdays.delete(id)
}
