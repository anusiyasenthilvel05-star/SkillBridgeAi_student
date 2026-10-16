import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { RichText } from '@/components/rich-text';

describe('RichText', () => {
  it('renders bold without asterisks', () => {
    const { container } = render(<RichText text="**MAE — Mean Absolute Error**" />);
    expect(container.querySelector('strong')?.textContent).toBe('MAE — Mean Absolute Error');
    expect(container.textContent).not.toContain('**');
  });
  it('renders headings without hashes', () => {
    const { container } = render(<RichText text="## Prediction Accuracy Formulas" />);
    expect(container.querySelector('h2')?.textContent).toBe('Prediction Accuracy Formulas');
  });
  it('renders inline and display LaTeX with KaTeX', () => {
    const { container } = render(<RichText text={'The formula is \\(\\displaystyle MAE=\\frac{1}{n}\\sum_{i=1}^{n}|y_i-\\hat{y}_i|\\)\n\n\\[RMSE = \\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(y_i-\\hat{y}_i)^2}\\]'} />);
    expect(container.querySelectorAll('.katex').length).toBe(2);
    expect(container.querySelector('.katex-display')).not.toBeNull();
  });
  it('renders tables and never raw HTML', () => {
    const { container } = render(<RichText text={'| a | b |\n|---|---|\n| 1 | 2 |\n\n<script>alert(1)</script><img src=x onerror=alert(1)>'} />);
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('script, img')).toBeNull();
  });
  it('keeps plain multiplication asterisks', () => {
    const { container } = render(<RichText text="Area = 3 * 4 = 12" />);
    expect(container.textContent).toContain('3 * 4 = 12');
  });
});
