import request from '@/utils/http'
import { AppRouteRecord } from '@/types/router'

// ---------------- 用户管理 ----------------

// 获取用户列表
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request.get<Api.SystemManage.UserList>({
    url: '/api/user/list',
    params
  })
}

// 新增用户
export function fetchCreateUser(data: Api.SystemManage.UserForm) {
  return request.post<Api.SystemManage.UserListItem>({
    url: '/api/user',
    data
  })
}

// 编辑用户
export function fetchUpdateUser(id: number, data: Api.SystemManage.UserForm) {
  return request.put<Api.SystemManage.UserListItem>({
    url: `/api/user/${id}`,
    data
  })
}

// 删除用户
export function fetchDeleteUser(id: number) {
  return request.del<void>({
    url: `/api/user/${id}`
  })
}

// ---------------- 角色管理 ----------------

// 获取角色列表
export function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  return request.get<Api.SystemManage.RoleList>({
    url: '/api/role/list',
    params
  })
}

// 获取所有启用的角色（用于下拉选择）
export function fetchGetRoleOptions() {
  return request.get<Api.SystemManage.RoleListItem[]>({
    url: '/api/role/options'
  })
}

// 新增角色
export function fetchCreateRole(data: Api.SystemManage.RoleForm) {
  return request.post<Api.SystemManage.RoleListItem>({
    url: '/api/role',
    data
  })
}

// 编辑角色
export function fetchUpdateRole(id: number, data: Api.SystemManage.RoleForm) {
  return request.put<Api.SystemManage.RoleListItem>({
    url: `/api/role/${id}`,
    data
  })
}

// 删除角色
export function fetchDeleteRole(id: number) {
  return request.del<void>({
    url: `/api/role/${id}`
  })
}

// 获取角色已分配的菜单和按钮 ID
export function fetchGetRoleMenuIds(id: number) {
  return request.get<number[]>({
    url: `/api/role/${id}/menus`
  })
}

// 保存角色的菜单权限
export function fetchSaveRoleMenuIds(id: number, menuIds: number[]) {
  return request.put<void>({
    url: `/api/role/${id}/menus`,
    data: { menuIds }
  })
}

// ---------------- 菜单管理 ----------------

// 获取当前用户的菜单（后端权限模式下用于生成路由）
export function fetchGetMenuList() {
  return request.get<AppRouteRecord[]>({
    url: '/api/menu/routes'
  })
}

// 获取完整菜单树（含禁用菜单和全部按钮，用于菜单管理和角色授权）
export function fetchGetMenuTree() {
  return request.get<AppRouteRecord[]>({
    url: '/api/menu/tree'
  })
}

// 新增菜单或按钮，返回新记录 ID
export function fetchCreateMenu(data: Api.SystemManage.MenuForm) {
  return request.post<number>({
    url: '/api/menu',
    data
  })
}

// 编辑菜单或按钮
export function fetchUpdateMenu(id: number, data: Api.SystemManage.MenuForm) {
  return request.put<void>({
    url: `/api/menu/${id}`,
    data
  })
}

// 删除菜单（连同子菜单和按钮）或按钮
export function fetchDeleteMenu(id: number) {
  return request.del<void>({
    url: `/api/menu/${id}`
  })
}
