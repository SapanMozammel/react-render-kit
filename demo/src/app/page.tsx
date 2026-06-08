import ToolCard from '@/components/tool-card';
import { TOOLS } from '@/lib/registry';

const HomePage = () => (
	<>
		<section className="home-hero">
			<p className="home-hero__eyebrow">react-render-kit</p>
			<h1 className="home-hero__title">
				React debugging,
				<br />
				<em>without the ceremony.</em>
			</h1>
			<p className="home-hero__subtitle">
				Drop-in hooks and utilities that explain exactly what&apos;s happening inside your React
				components. No configuration. No wrapping. One line.
			</p>
		</section>

		<section>
			<p className="tools-section__heading">Tools ({TOOLS.length})</p>
			<div className="tools-grid">
				{TOOLS.map((tool) => (
					<ToolCard key={tool.slug} tool={tool} />
				))}
			</div>
		</section>
	</>
);

export default HomePage;
