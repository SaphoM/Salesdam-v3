import styles from './AddMemberModal.module.css';
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getUsers } from '../../../services/api/users';
import { addWorkspaceMember } from '../../../services/api/workspaces';
import Button from '../../../components/common/Button/Button';
import Modal from '../../../components/common/Modal/Modal';

export default function AddMemberModal({
  isOpen,
  onClose,
  workspaceId,
  existingMembers,
  onSuccess,
}) {
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  const reset = () => {
    setUserSearch('');
    setSearchResults([]);
    setSelectedId('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const searchUsers = async (q) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await getUsers({ search: q, limit: 20 });
      console.log(res)

      const memberIds = new Set((existingMembers || []).map((m) => m._id || m));

      setSearchResults(
        (res || []).filter((u) => !memberIds.has(u._id)),
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedId) {
      toast.error('Select a user.');
      return;
    }

    try {
      await addWorkspaceMember(workspaceId, selectedId);
      toast.success('User added.');
      handleClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const selectedUser = searchResults.find((u) => u._id === selectedId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Member"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add</Button>
        </>
      }
    >
      <div className={styles.container}>
        <p className={styles.helper}>Search users to add to this workspace.</p>

        {/* Search */}
        <div className={styles.searchBox}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.input}
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setSelectedId('');
              searchUsers(e.target.value);
            }}
            placeholder="Search name or email..."
            autoFocus
          />
          {searching && <span className={styles.loadingDots}>...</span>}
        </div>

        {/* Selected */}
        {selectedUser && (
          <div className={styles.selected}>
            <div className={styles.avatar}>
              {selectedUser.firstName?.[0]}
              {selectedUser.lastName?.[0]}
            </div>
            <span className={styles.selectedText}>
              {selectedUser.firstName} {selectedUser.lastName} —{' '}
              {selectedUser.email}
            </span>
            <button
              className={styles.clearBtn}
              onClick={() => setSelectedId('')}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Results */}
        {userSearch.length >= 2 && !selectedId && (
          <div className={styles.results}>
            {searchResults.length === 0 && !searching ? (
              <p className={styles.noResults}>No users found</p>
            ) : (
              searchResults.map((u) => (
                <button
                  key={u._id}
                  className={styles.resultItem}
                  onClick={() => {
                    setSelectedId(u._id);
                    setUserSearch('');
                  }}
                >
                  <div className={styles.avatarSm}>
                    {u.firstName?.[0]}
                    {u.lastName?.[0]}
                  </div>
                  <div className={styles.resultInfo}>
                    <span>
                      {u.firstName} {u.lastName}
                    </span>
                    <small>{u.email}</small>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
