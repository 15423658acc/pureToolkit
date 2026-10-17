/**
 * 数据备份：JSON 导出/导入
 * ------------------------------------------------------------
 * 由于 IndexedDB 数据在用户清浏览器缓存时会被清掉，
 * 建议提供"一键导出 JSON 备份"和"导入恢复"。
 */
import {
  db,
  type ExpiryItem,
  type MediaItem,
  type ScheduleCompletion,
  type ScheduleItem,
  type ScheduleTagDef,
  type WheelHistory,
  type WheelTemplate
} from './db'

export interface BackupPayload {
  version: 1
  exportedAt: number
  data: {
    wheelTemplates: WheelTemplate[]
    wheelHistory: WheelHistory[]
    expiryItems: ExpiryItem[]
    mediaItems: MediaItem[]
    scheduleItems: ScheduleItem[]
    scheduleCompletions: ScheduleCompletion[]
    scheduleTags: ScheduleTagDef[]
  }
}

export async function exportAllData(): Promise<BackupPayload> {
  const [
    wheelTemplates,
    wheelHistory,
    expiryItems,
    mediaItems,
    scheduleItems,
    scheduleCompletions,
    scheduleTags
  ] = await Promise.all([
    db.wheelTemplates.toArray(),
    db.wheelHistory.toArray(),
    db.expiryItems.toArray(),
    db.mediaItems.toArray(),
    db.scheduleItems.toArray(),
    db.scheduleCompletions.toArray(),
    db.scheduleTags.toArray()
  ])
  return {
    version: 1,
    exportedAt: Date.now(),
    data: {
      wheelTemplates,
      wheelHistory,
      expiryItems,
      mediaItems,
      scheduleItems,
      scheduleCompletions,
      scheduleTags
    }
  }
}

export async function downloadBackup(): Promise<void> {
  const payload = await exportAllData()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `puretoolkit-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importFromJSON(file: File): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await file.text()
    const payload = JSON.parse(text) as Partial<BackupPayload>
    if (payload.version !== 1 || !payload.data) {
      return { ok: false, message: '备份文件格式不正确' }
    }
    const d: BackupPayload['data'] = payload.data
    await db.transaction('rw', [
      db.wheelTemplates, db.wheelHistory, db.expiryItems, db.mediaItems,
      db.scheduleItems, db.scheduleCompletions, db.scheduleTags
    ], async () => {
      await Promise.all([
        db.wheelTemplates.bulkPut(d.wheelTemplates ?? []),
        db.wheelHistory.bulkPut(d.wheelHistory ?? []),
        db.expiryItems.bulkPut(d.expiryItems ?? []),
        db.mediaItems.bulkPut(d.mediaItems ?? []),
        db.scheduleItems.bulkPut(d.scheduleItems ?? []),
        db.scheduleCompletions.bulkPut(d.scheduleCompletions ?? []),
        db.scheduleTags.bulkPut(d.scheduleTags ?? [])
      ])
    })
    const count =
      (d.wheelTemplates?.length ?? 0) +
      (d.expiryItems?.length ?? 0) +
      (d.mediaItems?.length ?? 0) +
      (d.scheduleItems?.length ?? 0) +
      (d.scheduleCompletions?.length ?? 0) +
      (d.scheduleTags?.length ?? 0)
    return { ok: true, message: `已恢复 ${count} 条记录` }
  } catch (e) {
    return { ok: false, message: '导入失败：' + (e as Error).message }
  }
}
