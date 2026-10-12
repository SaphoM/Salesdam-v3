import styles from './UserManagement.module.css';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Settings } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Button from '../../../components/common/Button/Button';
import Layout from '../../../layout/Layout';
import AddUserModal from './AddUserModal';
import UsersTable from './UsersTable/UsersTable';

const UserManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);

  const { data: usersData = {}, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => api.get('/users', {
      params: { search: search || undefined },
    }).then(res => res.data),
  });

  const users = usersData.data || [];

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`))
      return;

    try {
      await api.delete(`/users/${user._id}`);
      toast.success('User deleted.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSuccess = (message, isError = false) => {
    if (isError) toast.error(message);
    else toast.success(message);

    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  return (
    <Layout title="Users" description="Manage users and access">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>User Management</h1>
            <p className={styles.subtitle}>
              Manage users.{' '}
              <Link to="/setup/objects/user">
                <Settings size={12} /> Object Settings
              </Link>
            </p>
          </div>

          <div className={styles.actions}>
            <input
              className={styles.search}
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowAddUser(true)}
            >
              Add User
            </Button>
          </div>
        </div>

        <UsersTable
          users={users}
          loading={isLoading}
          onView={(id) => navigate(`/admin/users/${id}`)}
          onDelete={handleDelete}
        />

        <AddUserModal
          isOpen={showAddUser}
          onClose={() => setShowAddUser(false)}
          onSuccess={handleSuccess}
          api={api}
        />
      </div>
    </Layout>
  );
};

export default UserManagement;
