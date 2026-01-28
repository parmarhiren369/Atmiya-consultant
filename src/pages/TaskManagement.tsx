import { useAuth } from '../context/AuthContext';
import { TaskManagementDashboard } from '../components/TaskManagementDashboard';

export function TaskManagement() {
  const { user } = useAuth();

  // Admins are master_admin, regular users are sub_admin
  const userRole: 'master_admin' | 'sub_admin' = user?.role === 'admin' ? 'master_admin' : 'sub_admin';
  const currentUserId = user?.id || 'default_user';
  const currentUserDepartment = userRole === 'sub_admin' ? 'sales' : undefined;

  return (
    <TaskManagementDashboard
      userRole={userRole}
      currentUserId={currentUserId}
      currentUserDepartment={currentUserDepartment}
    />
  );
}
