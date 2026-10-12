import { Zap } from 'lucide-react';
import styles from '../RecordDetail.module.css';

const RecordTabs = ({ activeTab, setActiveTab, customScreens, embeddedFlows }) => {
  if ((customScreens?.length || 0) === 0 && (embeddedFlows?.length || 0) === 0) {
    return null;
  }

  return (
    <div className={styles.screenTabs}>
      <button
        className={`${styles.screenTab} ${activeTab === 'details' ? styles.screenTabActive : ''}`}
        onClick={() => setActiveTab('details')}
      >
        Details
      </button>
      {customScreens?.map((screen) => (
        <button
          key={screen?._id}
          className={`${styles.screenTab} ${activeTab === screen._id ? styles.screenTabActive : ''}`}
          onClick={() => setActiveTab(screen._id)}
        >
          {screen?.tabLabel || screen?.name}
        </button>
      ))}
      {embeddedFlows?.map((flow) => (
        <button
          key={flow?._id}
          className={`${styles.screenTab} ${activeTab === `flow_${flow?._id}` ? styles.screenTabActive : ''}`}
          onClick={() => setActiveTab(`flow_${flow?._id}`)}
        >
          <Zap size={12} style={{ marginRight: 4 }} />
          {flow?.name}
        </button>
      ))}
    </div>
  );
};

export default RecordTabs;
