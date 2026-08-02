import Link from "next/link";
export default function NotFound() { return <section className="not-found"><span>404</span><h1>Page not found</h1><p>The requested HiPER page does not exist or has not been published.</p><Link className="button" href="/">Back to homepage</Link></section>; }
