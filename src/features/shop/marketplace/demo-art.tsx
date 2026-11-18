import styles from "./explore-upgrade.module.css";

const inks = ["#8fe2e8", "#c7b2fa", "#ffd398", "#8ab8ff", "#a0e7bd"];
const rules = "M91 59h46m-46 13h35m-35 13h42";
const page = "M78 31h69l20 20v61H78z M147 31v20h20";

export default function DemoArt({ id, group }: { id: number; group: string }) {
  const accent = inks[id % inks.length];
  const sub = Math.floor((id - 100) / 3);
  const variant = (id - 100) % 3;
  const bars = [22 + variant * 7, 39 - variant * 3, 31 + variant * 9, 58 - variant * 4, 68];
  const lines = [
    "M55 92l27-16 28 9 27-38 29 8 30-25",
    "M55 91l26-9 26-26 28 15 28-31 33 2",
    "M55 88l26-20 29 4 28-15 26 4 32-28",
  ];

  function art() {
    switch (sub) {
      case 0: case 1: case 22:
        return variant === 1 && sub !== 0
          ? <><rect x="91" y="17" width="70" height="111" rx="11"/><rect x="101" y="32" width="50" height="30" rx="4" fill={accent} fillOpacity=".22"/><path d="M102 74h48m-48 13h32m-32 12h42"/><circle cx="126" cy="117" r="3"/></>
          : <><rect x="43" y="24" width="164" height="96" rx="10"/><path d="M43 44h164m-145-10h1m9 0h1m9 0h1"/><rect x={variant === 1 ? 129 : 57} y="55" width="64" height="49" rx="5" fill={accent} fillOpacity=".23"/><path d={variant === 1 ? "M59 61h49m-49 14h39m-39 13h48" : "M135 62h56m-56 13h39m-39 13h51"}/></>;
      case 2: case 3: case 4:
        return <><path d={variant === 0 ? "M80 72h25m40 0h25" : "M80 72h21v-21h24m23 0v44h25"}/><rect x="40" y="55" width="40" height="34" rx="7"/><rect x="106" y={variant ? 32 : 55} width="40" height="34" rx="7" fill={accent} fillOpacity=".22"/><rect x="174" y={variant ? 78 : 55} width="40" height="34" rx="7"/><path d={variant ? "M185 95l6 6 12-13" : "M185 72l6 6 12-13"}/><path d="M53 66h14m-14 10h14"/></>;
      case 5: case 15:
        return <><rect x="64" y="36" width="139" height="89" rx="7" opacity=".35" transform="rotate(7 125 72)"/><rect x="44" y="25" width="151" height="91" rx="7" fill="#16304d"/><path d="M57 42h58m-58 13h37m-37 36h55m-55 12h33"/>{variant === 1 ? <path d="M132 92l19-35 31 35z" fill={accent} fillOpacity=".3"/> : <circle cx="154" cy="73" r={variant ? 21 : 25} fill={accent} fillOpacity=".24"/>}</>;
      case 6: case 11: case 14:
        return <><path d="M94 20h82v84" opacity=".4"/><path d={page}/><path d={rules}/><rect x="92" y="96" width={variant ? 34 : 55} height="5" rx="2" fill={accent}/></>;
      case 7: case 8: case 9: case 10:
        return <><rect x="35" y="18" width="180" height="108" rx="10"/><path d="M50 102h151M50 34v68m0-17h151m-151-23h151m-151-23h151" opacity=".35"/>{sub <= 8 && bars.map((h, i) => <rect key={i} x={58 + 27 * i} y={102 - h} width="13" height={h} rx="2" fill={accent} fillOpacity=".23" stroke="none"/>)}<path d={lines[variant]}/></>;
      case 12:
        return <><rect x="41" y="33" width="168" height="75" rx="8"/><path d="M53 44h144M53 97h144m-103-64v75m64-75v75" opacity=".55"/><path d="m111 55 32 16-32 17z" fill={accent} fillOpacity=".28"/><path d="M63 18h124m-100 0v9m40-9v9m40-9v9"/></>;
      case 13: case 21:
        return <><rect x="42" y="23" width="166" height="98" rx="8"/><path d="M42 45h166m-166 23h166m-166 24h166M86 45v76m42-76v76m42-76v76"/><rect x={86 + variant * 42} y="68" width={variant === 2 ? 38 : 42} height="24" fill={accent} fillOpacity=".3"/><path d="M54 34h45" strokeWidth="4"/></>;
      case 16: case 17:
        return <><rect x="46" y="34" width="55" height="75" rx="9" fill={accent} fillOpacity=".15"/><rect x="108" y="24" width="95" height="91" rx="8"/><circle cx={139 + variant * 9} cy="62" r="16" fill={accent} fillOpacity=".29"/><path d="m117 99 20-22 16 13 19-17 20 26zM57 51h32m-32 12h25m-25 12h28"/></>;
      case 18:
        return <><path d="m125 23 52 25v48l-52 25-52-25V48z" fill={accent} fillOpacity=".16"/><path d="m73 48 52 25 52-25m-52 25v48m-26-86 52 25v48m-78-36 52 25 52-25" opacity=".8"/><ellipse cx="125" cy="83" rx="91" ry={variant ? 28 : 19} transform="rotate(-15 125 83)" opacity=".45"/></>;
      default:
        return <><rect x="38" y="24" width="174" height="97" rx="10"/><path d="M38 44h174m-161-10h1m9 0h1m9 0h1m13 23-15 14 15 14m30-28 15 14-15 14m-16 6 9-40"/><path d={variant ? "M144 62h48m-48 15h30m-30 15h41" : "M144 58h32m-32 15h48m-48 15h38"}/></>;
    }
  }

  return (
    <div className={styles.art} aria-hidden="true">
      <span>{group}</span>
      <svg viewBox="0 0 250 144" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {art()}
      </svg>
    </div>
  );
}
