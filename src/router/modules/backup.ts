import { AppRouteRecord } from '@/types/router'

/** 备份管理：一级菜单，无子菜单 */
export const backupRoutes: AppRouteRecord = {
  path: '/backup',
  name: 'LogBackup',
  component: '/backup/index',
  meta: {
    title: 'menus.backup.title',
    icon: 'ri:archive-drawer-line',
    keepAlive: true,
    roles: ['R_SUPER', 'R_ADMIN']
  }
}
