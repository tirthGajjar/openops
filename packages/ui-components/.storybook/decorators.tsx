import isChromatic from 'chromatic/isChromatic';
import { MemoryRouter } from 'react-router-dom';
import '../src/styles/global.css';
import '../src/tailwind.css';
import { ThemeSwitcherValue } from './preview';

export const ThemeSwitcherDecorator = ({
  children,
  context,
}: {
  children: React.ReactNode;
  context?: any;
}) => {
  const theme: ThemeSwitcherValue = context.globals.theme;
  const lightContainer = <div className="light">{children}</div>;
  const darkContainer = <div className="dark">{children}</div>;

  if (!isChromatic() && theme === ThemeSwitcherValue.LIGHT) {
    return lightContainer;
  }

  if (!isChromatic() && theme === ThemeSwitcherValue.DARK) {
    return darkContainer;
  }

  return (
    <div className="flex flex-col gap-10">
      {lightContainer}
      {darkContainer}
    </div>
  );
};

/**
 * Decorator that applies theme-aware styling based on Storybook's theme switcher
 */
export const ThemeAwareDecorator = (Story: any, context: any) => {
  const theme = context.globals.theme;
  const isDark = theme === ThemeSwitcherValue.DARK;

  return (
    <MemoryRouter>
      <div
        className={isDark ? 'dark p-32' : 'p-32'}
        style={{
          backgroundColor: isDark ? '#1f2937' : 'transparent',
          borderRadius: '8px',
        }}
      >
        <Story />
      </div>
    </MemoryRouter>
  );
};
