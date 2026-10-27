<!-- 备份管理：S3 兼容存储、各日志库的归档策略、归档记录（下载 / 恢复） -->
<template>
  <div class="backup-page logx-full-height">
    <ElCard shadow="never" class="backup-head">
      <div class="head-grid">
        <div class="head-block">
          <div class="head-block__title">
            <LogxSvgIcon icon="ri:cloud-line" />备份存储
            <ElButton link type="primary" size="small" @click="storageVisible = true">
              {{ storage ? '修改' : '配置' }}
            </ElButton>
          </div>
          <template v-if="storage">
            <div class="head-block__main mono"
              >{{ storage.bucket }}{{ storage.prefix ? `/${storage.prefix}` : '' }}</div
            >
            <div class="head-block__meta mono">{{ storage.endpoint }} · {{ storage.region }}</div>
          </template>
          <template v-else>
            <div class="head-block__main muted">尚未配置</div>
            <div class="head-block__meta"
              >归档文件保存到 S3 兼容对象存储（MinIO / OSS / COS / S3）</div
            >
          </template>
        </div>
        <div class="head-block">
          <div class="head-block__title"><LogxSvgIcon icon="ri:archive-line" />已归档</div>
          <div class="head-block__main">
            {{ totals.archives }} 天 · {{ formatBytes(totals.size) }}
          </div>
          <div class="head-block__meta">
            原始 {{ formatBytes(totals.raw)
            }}<template v-if="totals.size">，压缩为 {{ ratio(totals.raw, totals.size) }}</template>
          </div>
        </div>
        <div class="head-block">
          <div class="head-block__title">
            <LogxSvgIcon icon="ri:time-line" />归档任务
            <span class="muted small">每天 02:30 自动执行</span>
          </div>
          <div class="head-block__main">
            <template v-if="status?.running"
              ><span class="running"><i class="dot"></i>正在归档…</span></template
            >
            <template v-else-if="status?.lastFinishTime">
              上次 {{ status.lastFinishTime.slice(5, 16) }}：归档 {{ status.archived }} 天
              <span v-if="status.failed" class="text-danger">，失败 {{ status.failed }}</span>
              <span v-if="status.deleted">，清理 {{ status.deleted }}</span>
            </template>
            <span v-else class="muted">本次启动后尚未执行</span>
          </div>
          <div v-if="status?.error" class="head-block__meta text-danger">{{ status.error }}</div>
          <ElButton
            size="small"
            class="mt-2"
            :disabled="!storage || !enabledCount"
            :loading="status?.running"
            @click="run"
          >
            <LogxSvgIcon v-if="!status?.running" icon="ri:play-line" class="mr-1" />立即归档
          </ElButton>
        </div>
      </div>
      <ElAlert v-if="!storage" type="warning" :closable="false" show-icon class="mt-3">
        先配置备份存储，再为日志库开启归档。
        <ElButton link type="primary" @click="storageVisible = true">配置存储</ElButton>
      </ElAlert>
    </ElCard>

    <ElCard shadow="never" class="backup-body">
      <ElTabs v-model="tab" class="backup-tabs">
        <ElTabPane
          :label="`归档策略（${enabledCount}/${policies.length} 个日志库已开启）`"
          name="policies"
        >
          <ElTable v-loading="loadingPolicies" :data="policies" size="small" height="100%">
            <ElTableColumn label="日志库" min-width="180">
              <template #default="{ row }">
                <div class="name">{{ row.storeName }}</div>
                <div class="muted">{{ row.storeCode }} · 日志保留 {{ row.retentionDays }} 天</div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="归档" width="90">
              <template #default="{ row }">
                <ElTag v-if="row.enabled" type="success" size="small" effect="plain">已开启</ElTag>
                <ElTag v-else-if="row.enabled === false" type="info" size="small" effect="plain"
                  >已暂停</ElTag
                >
                <span v-else class="muted">未开启</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="策略" min-width="200">
              <template #default="{ row }">
                <template v-if="row.archiveAfterDays">
                  超过 {{ row.archiveAfterDays }} 天归档，保留 {{ row.keepDays }} 天
                  <ElTooltip
                    v-if="row.archiveAfterDays >= row.retentionDays"
                    content="归档时机不小于日志保留天数，部分日志会在归档前被删除"
                  >
                    <LogxSvgIcon icon="ri:error-warning-line" class="text-warning" />
                  </ElTooltip>
                </template>
                <span v-else class="muted">-</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="已归档" min-width="170">
              <template #default="{ row }">
                <template v-if="row.archives">
                  <div>{{ row.archives }} 天 · {{ formatBytes(row.archivedBytes) }}</div>
                  <div class="muted"
                    >原始 {{ formatBytes(row.rawBytes) }}，压缩为
                    {{ ratio(row.rawBytes, row.archivedBytes) }}</div
                  >
                </template>
                <span v-else class="muted">-</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="最近归档日" width="120">
              <template #default="{ row }">
                {{ row.latestDay ?? '-' }}
                <div v-if="row.failed" class="text-danger small"
                  >{{ row.failed }} 天失败，下次重试</div
                >
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <ElButton
                  link
                  type="primary"
                  size="small"
                  :disabled="!storage"
                  @click="editPolicy(row)"
                >
                  {{ row.archiveAfterDays ? '设置' : '开启归档' }}
                </ElButton>
                <ElButton
                  v-if="row.archives"
                  link
                  type="primary"
                  size="small"
                  @click="showArchives(row.storeId)"
                >
                  归档记录
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <ElTabPane label="归档记录" name="archives">
          <div class="toolbar">
            <ElSelect
              v-model="filterStore"
              placeholder="全部日志库"
              clearable
              size="small"
              class="toolbar-store"
            >
              <ElOption
                v-for="item in policies"
                :key="item.storeId"
                :value="item.storeId"
                :label="item.storeName"
              />
            </ElSelect>
            <ElRadioGroup v-model="filterStatus" size="small">
              <ElRadioButton value="">全部</ElRadioButton>
              <ElRadioButton value="success">成功</ElRadioButton>
              <ElRadioButton value="failed">失败</ElRadioButton>
            </ElRadioGroup>
            <ElButton size="small" :loading="loadingArchives" @click="loadArchives()">
              <LogxSvgIcon v-if="!loadingArchives" icon="ri:refresh-line" class="mr-1" />刷新
            </ElButton>
            <span class="muted small"
              >归档为 gzip 压缩的 JSON Lines，下载后可用 zcat / 解压工具直接查看</span
            >
          </div>
          <ElTable
            v-loading="loadingArchives"
            :data="archives"
            size="small"
            height="100%"
            class="table"
          >
            <template #empty>
              <ElEmpty :image-size="72" description="还没有归档" />
            </template>
            <ElTableColumn label="日期" width="120">
              <template #default="{ row }"
                ><span class="mono">{{ row.day }}</span></template
              >
            </ElTableColumn>
            <ElTableColumn label="日志库" min-width="140">
              <template #default="{ row }">{{ storeName(row) }}</template>
            </ElTableColumn>
            <ElTableColumn label="日志数" width="110" align="right">
              <template #default="{ row }"
                ><span class="mono">{{ row.recordCount.toLocaleString() }}</span></template
              >
            </ElTableColumn>
            <ElTableColumn label="大小" width="170">
              <template #default="{ row }">
                <template v-if="row.status === 'success'">
                  <span class="mono">{{ formatBytes(row.sizeBytes) }}</span>
                  <span class="muted"> / 原始 {{ formatBytes(row.rawBytes) }}</span>
                </template>
                <span v-else class="muted">-</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" min-width="200">
              <template #default="{ row }">
                <template v-if="row.status === 'failed'">
                  <ElTooltip :content="row.error ?? ''" placement="top">
                    <ElTag type="danger" size="small">归档失败</ElTag>
                  </ElTooltip>
                  <span class="muted small ml-2">下次运行重试</span>
                </template>
                <template v-else>
                  <ElTag type="success" size="small" effect="plain">已归档</ElTag>
                  <template v-if="row.restoreStatus">
                    <ElTooltip
                      :content="RESTORE_TIPS[row.restoreStatus as Api.Backup.RestoreStatus](row)"
                      placement="top"
                    >
                      <ElTag
                        :type="RESTORE_TAGS[row.restoreStatus as Api.Backup.RestoreStatus]"
                        size="small"
                        class="ml-1"
                      >
                        {{ RESTORE_NAMES[row.restoreStatus as Api.Backup.RestoreStatus] }}
                      </ElTag>
                    </ElTooltip>
                  </template>
                </template>
              </template>
            </ElTableColumn>
            <ElTableColumn label="归档时间" width="160" prop="archiveTime" />
            <ElTableColumn label="操作" width="190" fixed="right">
              <template #default="{ row }">
                <template v-if="row.status === 'success'">
                  <ElButton link type="primary" size="small" @click="download(row)">下载</ElButton>
                  <ElButton
                    v-if="row.restoreStatus === 'restored'"
                    link
                    type="primary"
                    size="small"
                    @click="openLogs(row)"
                    >查看日志</ElButton
                  >
                  <ElButton
                    v-else
                    link
                    type="primary"
                    size="small"
                    :disabled="row.restoreStatus === 'restoring' || !storeExists(row)"
                    @click="restore(row)"
                    >恢复</ElButton
                  >
                </template>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <StorageDialog v-model="storageVisible" :storage="storage" @saved="loadAll" />
    <PolicyDialog v-model="policyVisible" :policy="editing" @saved="loadPolicies" />
  </div>
</template>

<script setup lang="ts">
  import LogxSvgIcon from '@/components/core/base/logx-svg-icon/index.vue'
  import { ElMessageBox } from 'element-plus'
  import StorageDialog from './modules/storage-dialog.vue'
  import PolicyDialog from './modules/policy-dialog.vue'
  import {
    fetchArchiveDownloadLink,
    fetchArchives,
    fetchBackupPolicies,
    fetchBackupStatus,
    fetchBackupStorage,
    restoreArchive,
    runBackup
  } from '@/api/backup'
  import { formatBytes } from '@/views/monitor/shared'

  defineOptions({ name: 'LogBackup' })

  type Archive = Api.Backup.Archive
  type RestoreStatus = Api.Backup.RestoreStatus

  const RESTORE_NAMES: Record<RestoreStatus, string> = {
    restoring: '恢复中',
    restored: '已恢复',
    failed: '恢复失败',
    expired: '恢复已过期'
  }
  const RESTORE_TAGS: Record<RestoreStatus, 'warning' | 'primary' | 'danger' | 'info'> = {
    restoring: 'warning',
    restored: 'primary',
    failed: 'danger',
    expired: 'info'
  }
  const RESTORE_TIPS: Record<RestoreStatus, (archive: Archive) => string> = {
    restoring: () => '正在从存储读取并写回日志库',
    restored: (archive) => `可在日志查询中查看，保留到 ${archive.restoredUntil}`,
    failed: (archive) => `恢复失败：${archive.restoreError ?? ''}，可重新恢复`,
    expired: (archive) => `恢复的日志已于 ${archive.restoredUntil} 清理，可再次恢复`
  }

  const router = useRouter()
  const tab = ref<'policies' | 'archives'>('policies')
  const storage = ref<Api.Backup.Storage | null>(null)
  const status = ref<Api.Backup.Status>()
  const policies = ref<Api.Backup.Policy[]>([])
  const archives = ref<Archive[]>([])
  const loadingPolicies = ref(false)
  const loadingArchives = ref(false)
  const filterStore = ref<number>()
  const filterStatus = ref('')
  const storageVisible = ref(false)
  const policyVisible = ref(false)
  const editing = ref<Api.Backup.Policy>()

  const enabledCount = computed(() => policies.value.filter((policy) => policy.enabled).length)
  const totals = computed(() => ({
    archives: policies.value.reduce((sum, policy) => sum + policy.archives, 0),
    size: policies.value.reduce((sum, policy) => sum + policy.archivedBytes, 0),
    raw: policies.value.reduce((sum, policy) => sum + policy.rawBytes, 0)
  }))

  const ratio = (raw: number, size: number) =>
    size ? `1/${Math.max(1, Math.round(raw / size))}` : '-'

  const storeName = (archive: Archive) =>
    policies.value.find((policy) => policy.storeId === archive.storeId)?.storeName ??
    `${archive.storeCode}（已删除）`
  const storeExists = (archive: Archive) =>
    policies.value.some((policy) => policy.storeId === archive.storeId)

  const loadPolicies = async () => {
    loadingPolicies.value = true
    try {
      policies.value = await fetchBackupPolicies()
    } finally {
      loadingPolicies.value = false
    }
  }

  const loadArchives = async (quiet = false) => {
    if (!quiet) loadingArchives.value = true
    try {
      archives.value = await fetchArchives({
        storeId: filterStore.value,
        status: filterStatus.value || undefined,
        limit: 1000
      })
    } finally {
      loadingArchives.value = false
    }
  }

  const loadStatus = async () => {
    status.value = await fetchBackupStatus()
  }

  const loadAll = async () => {
    storage.value = await fetchBackupStorage()
    await Promise.all([loadPolicies(), loadArchives(), loadStatus()])
  }

  const editPolicy = (policy: Api.Backup.Policy) => {
    editing.value = policy
    policyVisible.value = true
  }

  const showArchives = (storeId: number) => {
    filterStore.value = storeId
    tab.value = 'archives'
  }

  const run = async () => {
    status.value = await runBackup()
    ElMessage.success('已开始归档，完成后自动刷新')
    poll()
  }

  const restore = async (archive: Archive) => {
    try {
      await ElMessageBox.confirm(
        `把 ${storeName(archive)} ${archive.day} 的 ${archive.recordCount.toLocaleString()} 条日志恢复到日志库？恢复后可在日志查询中查看，保留 7 天后自动清理（不影响归档文件）。`,
        '恢复归档',
        { confirmButtonText: '恢复', cancelButtonText: '取消', type: 'info' }
      )
    } catch {
      return
    }
    await restoreArchive(archive.id)
    ElMessage.success('已开始恢复，完成后可查看日志')
    await loadArchives(true)
    poll()
  }

  const download = async (archive: Archive) => {
    const { url } = await fetchArchiveDownloadLink(archive.id)
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
    // 下载链接自带 10 分钟有效的签名，浏览器直接下载，不经过前端内存
    window.open(`${base}${url}`, '_blank', 'noopener')
  }

  const openLogs = (archive: Archive) => {
    router.push({
      name: 'LogQuery',
      query: {
        storeId: archive.storeId,
        start: `${archive.day} 00:00:00`,
        end: `${archive.day} 23:59:59`
      }
    })
  }

  // 有归档或恢复在进行时每 3 秒刷新，结束后停止
  let timer: ReturnType<typeof setTimeout> | undefined
  const poll = () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      await Promise.all([loadStatus(), loadArchives(true)])
      const busy =
        status.value?.running ||
        archives.value.some((archive) => archive.restoreStatus === 'restoring')
      if (busy) poll()
      else loadPolicies()
    }, 3000)
  }

  watch([filterStore, filterStatus], () => loadArchives())

  /**
   * 从日志库卡片带 storeId 进来：未设置归档的直接打开策略设置，已设置的显示其归档记录
   */
  const route = useRoute()
  const applyRoute = () => {
    const storeId = Number(route.query.storeId)
    const policy = policies.value.find((item) => item.storeId === storeId)
    if (!policy) return
    if (!policy.archiveAfterDays) {
      if (storage.value) editPolicy(policy)
      else storageVisible.value = true
    } else {
      filterStore.value = storeId
      tab.value = 'archives'
    }
  }
  watch(
    () => route.query.storeId,
    (id) => {
      if (id && route.name === 'LogBackup') applyRoute()
    }
  )

  let activatedOnce = false
  onMounted(async () => {
    await loadAll()
    applyRoute()
    if (
      status.value?.running ||
      archives.value.some((archive) => archive.restoreStatus === 'restoring')
    )
      poll()
  })
  // 页面被缓存时，再次进入刷新（首次进入由 onMounted 加载）
  onActivated(() => {
    if (activatedOnce) loadAll()
    activatedOnce = true
  })
  onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
  .backup-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .backup-head {
    flex: none;
  }

  .backup-head :deep(.el-card__body) {
    padding: 16px 20px;
  }

  .head-grid {
    display: grid;
    grid-template-columns: 1.3fr 1fr 1.2fr;
    gap: 16px;
  }

  .head-block + .head-block {
    padding-left: 16px;
    border-left: 1px solid var(--el-border-color-lighter);
  }

  .head-block__title {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .head-block__main {
    margin-top: 6px;
    overflow: hidden;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .head-block__meta {
    margin-top: 2px;
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .backup-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .backup-body :deep(.el-card__body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 6px 20px 16px;
  }

  .backup-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .backup-tabs :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
  }

  .backup-tabs :deep(.el-tab-pane) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .table {
    flex: 1;
    min-height: 0;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 10px;
    align-items: center;
    margin-bottom: 10px;
  }

  .toolbar-store {
    width: 180px;
  }

  .name {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px;
  }

  .muted {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .small {
    font-size: 12px;
  }

  .text-danger {
    color: #dc2626;
  }

  .text-warning {
    color: #f59e0b;
  }

  .running {
    display: inline-flex;
    align-items: center;
    color: #2563eb;
  }

  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 6px;
    background: currentcolor;
    border-radius: 50%;
    animation: pulse 1.2s infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }

  @media (width <= 640px) {
    .head-grid {
      grid-template-columns: 1fr;
    }

    .head-block + .head-block {
      padding-top: 12px;
      padding-left: 0;
      border-top: 1px solid var(--el-border-color-lighter);
      border-left: none;
    }
  }
</style>
