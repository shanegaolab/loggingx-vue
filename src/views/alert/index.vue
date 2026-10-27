<!-- 告警中心（一级菜单）：日志告警与监控告警的事件、规则，以及邮件 / 短信通知 -->
<template>
  <div class="alert-page logx-full-height">
    <ElCard shadow="never" class="alert-body">
      <ElTabs v-model="tab" class="alert-tabs">
        <ElTabPane name="events">
          <template #label>
            告警事件
            <ElBadge v-if="firingCount" :value="firingCount" type="danger" class="tab-badge" />
          </template>
          <EventList @firing="firingCount = $event" />
        </ElTabPane>
        <ElTabPane label="日志告警规则" name="log-rules" lazy>
          <LogRules />
        </ElTabPane>
        <ElTabPane label="监控告警规则" name="host-rules" lazy>
          <HostRules />
        </ElTabPane>
        <ElTabPane label="通知设置" name="channels" lazy>
          <div class="scroll">
            <NotifyChannels />
          </div>
        </ElTabPane>
        <ElTabPane label="通知组" name="groups" lazy>
          <NotifyGroups />
        </ElTabPane>
        <ElTabPane label="通知记录" name="records" lazy>
          <NotifyRecords />
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchAlertStores,
    fetchLogRules,
    fetchNotifyGroups,
    fetchNotifyUsers
  } from '@/api/alert-center'
  import { ALERT_CENTER } from './shared'
  import EventList from './modules/event-list.vue'
  import HostRules from './modules/host-rules.vue'
  import LogRules from './modules/log-rules.vue'
  import NotifyChannels from './modules/notify-channels.vue'
  import NotifyGroups from './modules/notify-groups.vue'
  import NotifyRecords from './modules/notify-records.vue'

  defineOptions({ name: 'HostAlert' })

  type Tab = 'events' | 'log-rules' | 'host-rules' | 'channels' | 'groups' | 'records'
  const TABS: Tab[] = ['events', 'log-rules', 'host-rules', 'channels', 'groups', 'records']

  const route = useRoute()
  const tab = ref<Tab>('events')
  const firingCount = ref(0)

  const stores = ref<Api.AlertCenter.StoreOption[]>([])
  const users = ref<Api.AlertCenter.UserOption[]>([])
  const groups = ref<Api.AlertCenter.Group[]>([])
  const logRules = ref<Api.AlertCenter.LogRule[]>([])

  const reloadGroups = async () => {
    groups.value = await fetchNotifyGroups()
  }
  const reloadLogRules = async () => {
    logRules.value = await fetchLogRules()
  }

  provide(ALERT_CENTER, { stores, users, groups, logRules, reloadGroups, reloadLogRules })

  // 支持 ?tab=channels 等直接打开某个页签
  const applyRoute = () => {
    const wanted = route.query.tab as Tab
    if (route.name === 'HostAlert' && TABS.includes(wanted)) tab.value = wanted
  }
  watch(() => route.query.tab, applyRoute)

  onMounted(() => {
    applyRoute()
    fetchAlertStores().then((list) => (stores.value = list))
    fetchNotifyUsers().then((list) => (users.value = list))
    reloadGroups()
    reloadLogRules()
  })
</script>

<style scoped>
  .alert-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .alert-body :deep(.el-card__body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 6px 20px 16px;
  }

  .alert-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .alert-tabs :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
  }

  .alert-tabs :deep(.el-tab-pane) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .tab-badge {
    margin-left: 6px;
  }

  .tab-badge :deep(.el-badge__content) {
    position: static;
    transform: none;
  }
</style>
