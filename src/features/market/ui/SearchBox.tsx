import { MESSAGES } from '../../../shared/ui/messages';

interface SearchBoxProps {
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}

// 검색어는 글자로만 다룬다 (innerHTML 금지, React 가 값을 넣는다).
export function SearchBox({ value, disabled, onChange }: SearchBoxProps) {
  return (
    <label className="search-box">
      <span className="visually-hidden">{MESSAGES.searchLabel}</span>
      <input
        type="search"
        value={value}
        disabled={disabled}
        placeholder={MESSAGES.searchPlaceholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
