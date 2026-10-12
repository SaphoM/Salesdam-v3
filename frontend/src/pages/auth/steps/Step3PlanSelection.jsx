import styles from '../Register.module.css';

export default function Step3PlanSelection({ form, onChange, onPlanSelect, onDebitDaySelect, plans, isPlansLoading }) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Number of Employees <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          name="employees"
          value={form.employees}
          onChange={onChange}
          className={styles.input}
          required
          min="1"
        />
      </div>

      <div className={styles.planSection}>
        <h3 className={styles.planTitle}>
          Choose Your Plan <span className={styles.required}>*</span>
        </h3>
        <div className={styles.planOptions}>
          {isPlansLoading ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem', width: '100%' }}>
              Loading plans...
            </div>
          ) : Array.isArray(plans) && plans.length > 0 ? (
            plans.map((plan) => {
              const planId = plan._id || plan.plan_code || plan.id;
              return (
                <label
                  key={planId}
                  className={`${styles.planCard} ${
                    form.planId === planId ? styles.selected : ''
                  }`}
                  onClick={() => onPlanSelect(planId)}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="radio"
                    name="planId"
                    value={planId}
                    checked={form.planId === planId}
                    onChange={() => onPlanSelect(planId)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <h4>{plan.name}</h4>
                    <span className={styles.planPrice}>
                      {`R${plan.amount}/mo per user`}
                    </span>
                  </div>
                </label>
              );
            })
          ) : (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem', width: '100%' }}>
              No plans available
            </div>
          )}
        </div>
      </div>

      <div className={styles.debitOrderSection}>
        <label className={styles.debitOrderLabel}>
          Debit Order Day <span className={styles.required}>*</span>
        </label>
        <p className={styles.debitOrderHint}>
          Choose the day of the month your subscription will be
          debited (1–28).
        </p>
        <div className={styles.debitOrderGrid}>
          {[1, 5, 10, 15, 20, 25, 28].map((day) => (
            <button
              key={day}
              type="button"
              className={`${styles.debitDayBtn} ${
                Number(form.debitOrderDay) === day
                  ? styles.debitDaySelected
                  : ''
              }`}
              onClick={() => onDebitDaySelect(day)}
            >
              {day}
            </button>
          ))}
        </div>
        <div className={styles.debitOrderCustom}>
          <span>Or enter a custom day:</span>
          <input
            type="number"
            name="debitOrderDay"
            value={form.debitOrderDay}
            onChange={onChange}
            min="1"
            max="28"
            className={styles.debitOrderInput}
          />
        </div>
      </div>

      <div className={styles.tacbox}>
        <input
          id="checkbox"
          type="checkbox"
          name="terms"
          checked={form.terms}
          onChange={onChange}
          required
        />
        <label htmlFor="checkbox">
          I agree to the{' '}
          <a
            href="https://salesdam.com/terms-conditions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms and Conditions
          </a>
        </label>
      </div>
    </div>
  );
}
