interface SettingsSection {
  id: string;
  label: string;
}

interface SettingsSidebarProps {
  sections: SettingsSection[];
  activeSection: string;
  onSectionClick: (id: string) => void;
}

export function SettingsSidebar({ sections, activeSection, onSectionClick }: SettingsSidebarProps) {
  return (
    <nav className="hidden md:block w-[160px] shrink-0 sticky top-[calc(var(--header-height,4rem)+2rem)] self-start">
      <ul className="space-y-1">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <li key={section.id}>
              <button
                title={section.label}
                onClick={() => onSectionClick(section.id)}
                className={`
                  h-8 w-full flex items-center text-xs truncate
                  transition-colors duration-200 pl-3 border-l-2 text-left
                  ${isActive
                    ? 'border-[#CC785C] text-foreground font-medium'
                    : 'border-transparent text-muted-foreground opacity-50 hover:opacity-100 hover:text-foreground'
                  }
                `}
              >
                {section.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
