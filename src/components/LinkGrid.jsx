import LinkCard from './LinkCard.jsx';
import links from '../data/links.js';

/** LinkGrid \u2013 Rendert alle Link-Karten als responsives Grid */
export default function LinkGrid() {
  return (
    <div className="link-grid">
      {links.map((link, i) => (
        <LinkCard key={i} {...link} />
      ))}
    </div>
  );
}