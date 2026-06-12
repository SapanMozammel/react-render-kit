import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'react-render-kit — React Render Observability SDK';
export const size = { width: 1200, height: 600 };
export const contentType = 'image/png';

const TwitterImage = () =>
	new ImageResponse(
		(
			<div
				style={{
					background: '#111111',
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					justifyContent: 'center',
					padding: '72px 96px',
					fontFamily: 'sans-serif',
				}}
			>
				{/* Icon mark — geometric "r" */}
				<div style={{ position: 'relative', width: '82px', height: '84px', marginBottom: '40px' }}>
					{/* stem */}
					<div style={{ position: 'absolute', left: '0px', top: '46px', width: '22px', height: '38px', background: '#5a9cf8' }} />
					{/* circle head (r=33, leftmost at x=0) */}
					<div style={{ position: 'absolute', left: '0px', top: '0px', width: '66px', height: '66px', borderRadius: '50%', background: '#5a9cf8' }} />
					{/* concave cutout — left edge tangent to stem right (x=22) */}
					<div style={{ position: 'absolute', left: '22px', top: '36px', width: '60px', height: '60px', borderRadius: '50%', background: '#111111' }} />
				</div>

				{/* Title */}
				<div
					style={{
						fontSize: '76px',
						fontWeight: 800,
						color: '#ededed',
						lineHeight: 1.05,
						letterSpacing: '-0.03em',
						marginBottom: '20px',
					}}
				>
					react-render-kit
				</div>

				{/* Subtitle */}
				<div
					style={{
						fontSize: '26px',
						color: '#888888',
					}}
				>
					React Render Observability SDK — 12 dev-only packages
				</div>
			</div>
		),
		{ ...size },
	);

export default TwitterImage;
