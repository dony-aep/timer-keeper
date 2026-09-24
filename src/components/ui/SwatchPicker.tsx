import { useState } from 'react'
import {
  Button as AriaButton,
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorThumb,
  Dialog,
  DialogTrigger,
  Input,
  Popover,
  SliderTrack,
  parseColor,
} from 'react-aria-components'
import styles from './SwatchPicker.module.css'

/** Chosen to stay readable on the dark panel surfaces. */
export const PROJECT_COLORS = [
  { hex: '#f87171', name: 'Red' },
  { hex: '#fb923c', name: 'Orange' },
  { hex: '#facc15', name: 'Yellow' },
  { hex: '#a3e635', name: 'Lime' },
  { hex: '#4ade80', name: 'Green' },
  { hex: '#2dd4bf', name: 'Teal' },
  { hex: '#38bdf8', name: 'Sky' },
  { hex: '#818cf8', name: 'Indigo' },
  { hex: '#c084fc', name: 'Purple' },
  { hex: '#f472b6', name: 'Pink' },
] as const

interface SwatchPickerProps {
  /** Project name, used in the accessible labels. */
  label: string
  /** Color shown in the swatch (custom or automatic). */
  color: string
  /** The project's own color, when it has one. */
  customColor?: string
  onChange: (color: string | null) => void
}

/**
 * Free color picker. Edits a local draft and only saves on Apply: saving on every drag
 * step would rewrite timerData.json dozens of times per second.
 */
function CustomColor({ initial, onApply }: { initial: string; onApply: (hex: string) => void }) {
  const [draft, setDraft] = useState(() => parseColor(initial).toFormat('hsb'))
  return (
    <ColorPicker value={draft} onChange={setDraft}>
      <div className={styles.custom}>
        <ColorArea
          className={styles.area}
          colorSpace="hsb"
          xChannel="saturation"
          yChannel="brightness"
          aria-label="Saturation and brightness"
        >
          <ColorThumb className={styles.thumb} />
        </ColorArea>
        <ColorSlider className={styles.hue} colorSpace="hsb" channel="hue" aria-label="Hue">
          <SliderTrack className={styles.hueTrack}>
            <ColorThumb className={`${styles.thumb} ${styles.hueThumb}`} />
          </SliderTrack>
        </ColorSlider>
        <div className={styles.customRow}>
          <ColorField className={styles.hexField} aria-label="Hex color">
            <Input className={styles.hexInput} />
          </ColorField>
          <AriaButton className={styles.apply} onPress={() => onApply(draft.toString('hex'))}>
            Apply
          </AriaButton>
        </div>
      </div>
    </ColorPicker>
  )
}

/** Legend swatch that opens a palette and a free picker to choose the project's color. */
export function SwatchPicker({ label, color, customColor, onChange }: SwatchPickerProps) {
  return (
    <DialogTrigger>
      <AriaButton className={styles.trigger} aria-label={`Change color of ${label}`}>
        <span className={styles.swatch} style={{ background: color }} />
      </AriaButton>
      <Popover className={styles.popover} placement="bottom start" offset={6}>
        <Dialog className={styles.dialog} aria-label={`Color of ${label}`}>
          {({ close }) => (
            <>
              <div className={styles.grid}>
                {PROJECT_COLORS.map((c) => (
                  <AriaButton
                    key={c.hex}
                    aria-label={c.name}
                    className={c.hex === customColor ? `${styles.option} ${styles.optionSelected}` : styles.option}
                    style={{ background: c.hex }}
                    onPress={() => {
                      onChange(c.hex)
                      close()
                    }}
                  />
                ))}
              </div>
              <CustomColor
                initial={customColor ?? color}
                onApply={(hex) => {
                  onChange(hex)
                  close()
                }}
              />
              <AriaButton
                className={styles.reset}
                isDisabled={!customColor}
                onPress={() => {
                  onChange(null)
                  close()
                }}
              >
                Automatic
              </AriaButton>
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
