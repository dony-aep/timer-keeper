import {
  SearchField as AriaSearchField,
  Input,
  Button,
  type SearchFieldProps as AriaSearchFieldProps,
} from 'react-aria-components'
import { Icon } from './Icon'
import styles from './SearchField.module.css'

interface SearchFieldProps extends Omit<AriaSearchFieldProps, 'className' | 'children'> {
  placeholder?: string
  'aria-label': string
}

/** Instrument-style search field: glyph, input, and a clear glyph wired by react-aria. */
export function SearchField({ placeholder, ...rest }: SearchFieldProps) {
  return (
    <AriaSearchField {...rest} className={styles.field}>
      <Icon name="search" size={16} className={styles.searchIcon} />
      <Input className={styles.input} placeholder={placeholder} />
      <Button className={styles.clear}>
        <Icon name="close" size={14} />
      </Button>
    </AriaSearchField>
  )
}
