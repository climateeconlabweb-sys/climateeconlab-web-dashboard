import { promises as fs } from 'fs'
import path from 'path'

export interface PageContent { draftHtml: string; publishedHtml: string; updatedAt: string }

/** 콘텐츠 저장소 인터페이스 — Supabase 이관 시 이 파일의 구현만 교체 (구현계획 '추후 이관 작업') */
export interface ContentStore {
  load(): Promise<PageContent>
  saveDraft(html: string): Promise<void>
  publish(): Promise<void>
}

const FILE = path.join(process.cwd(), 'content', 'model-page.json')

async function write(c: PageContent): Promise<void> {
  await fs.writeFile(FILE, JSON.stringify({ ...c, updatedAt: new Date().toISOString() }, null, 2))
}

export const contentStore: ContentStore = {
  async load() {
    return JSON.parse(await fs.readFile(FILE, 'utf8'))
  },
  async saveDraft(html) {
    await write({ ...(await this.load()), draftHtml: html })
  },
  async publish() {
    const c = await this.load()
    await write({ ...c, publishedHtml: c.draftHtml })
  },
}
