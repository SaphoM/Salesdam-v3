import styles from '../Register.module.css';

export default function Step1PersonalInfo({ form, onChange, isValid, error }) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.row}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            First Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={onChange}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Last Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={onChange}
            className={styles.input}
            required
          />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Email Address <span className={styles.required}>*</span>
        </label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={onChange}
          className={styles.input}
          required
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Phone <span className={styles.required}>*</span>
        </label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={onChange}
          className={styles.input}
          required
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Company Name <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          name="companyName"
          value={form.companyName}
          onChange={onChange}
          className={styles.input}
          required
        />
      </div>
    </div>
  );
}
