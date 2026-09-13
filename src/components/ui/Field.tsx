import type { ReactNode } from 'react';

export function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={`field${full ? ' full' : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

interface TextProps {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  min?: string;
}

export function TextInput({ value, onChange, type = 'text', ...rest }: TextProps) {
  return <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function NumberInput({
  value,
  onChange,
  step = '0.01',
  min,
  placeholder,
  required,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: string;
  min?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      className="input"
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      placeholder={placeholder}
      required={required}
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea className="textarea" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}
