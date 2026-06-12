import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'react-render-kit — React Render Observability SDK';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const OgImage = () =>
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
					padding: '80px 96px',
					fontFamily: 'sans-serif',
				}}
			>
				{/* Icon mark — geometric "r": stem + circle head + concave notch */}
				<div style={{ position: 'relative', width: '90px', height: '92px', marginBottom: '48px' }}>
					{/* stem */}
					<div style={{ position: 'absolute', left: '0px', top: '50px', width: '24px', height: '42px', background: '#5a9cf8' }} />
					{/* circle head (r=36, leftmost at x=0 aligned with stem left) */}
					<div style={{ position: 'absolute', left: '0px', top: '0px', width: '72px', height: '72px', borderRadius: '50%', background: '#5a9cf8' }} />
					{/* concave cutout — left edge tangent to stem right (x=24), carves the r counter-space */}
					<div style={{ position: 'absolute', left: '24px', top: '40px', width: '64px', height: '64px', borderRadius: '50%', background: '#111111' }} />
				</div>

				{/* Package badge */}
				<div
					style={{
						fontSize: '22px',
						color: '#5a9cf8',
						background: 'rgba(90, 156, 248, 0.12)',
						border: '1px solid rgba(90, 156, 248, 0.3)',
						borderRadius: '6px',
						padding: '8px 18px',
						marginBottom: '32px',
						fontFamily: 'monospace',
						letterSpacing: '-0.01em',
					}}
				>
					@sapanmozammel/render-kit
				</div>

				{/* Title */}
				<div
					style={{
						fontSize: '80px',
						fontWeight: 800,
						color: '#ededed',
						lineHeight: 1.05,
						letterSpacing: '-0.03em',
						marginBottom: '24px',
					}}
				>
					react-render-kit
				</div>

				{/* Subtitle */}
				<div
					style={{
						fontSize: '28px',
						color: '#888888',
						lineHeight: 1.4,
						maxWidth: '720px',
					}}
				>
					React Render Observability SDK
				</div>

				{/* Pills */}
				<div
					style={{
						display: 'flex',
						gap: '16px',
						marginTop: '56px',
					}}
				>
					{['12 packages', 'dev-only', 'zero production cost'].map((label) => (
						<div
							key={label}
							style={{
								fontSize: '16px',
								color: '#555555',
								background: '#1c1c1c',
								border: '1px solid #2a2a2a',
								borderRadius: '20px',
								padding: '6px 16px',
								fontFamily: 'monospace',
							}}
						>
							{label}
						</div>
					))}
				</div>
			</div>
		),
		{ ...size },
	);

export default OgImage;
