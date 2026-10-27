import { AppRouteRecord } from '@/types/router'

/** 告警中心：一级菜单，无子菜单 */
export const alertRoutes: AppRouteRecord = {
  path: '/alert',
  name: 'HostAlert',
  component: '/alert/index',
  meta: {
    title: 'menus.alert.title',
    icon: 'ri:alarm-warning-line',
    keepAlive: true,
    roles: ['R_SUPER', 'R_ADMIN']
  }
}
