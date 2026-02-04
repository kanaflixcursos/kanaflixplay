import { CreditCard } from 'lucide-react';

interface CardBrandIconProps {
  brand: string;
  className?: string;
}

const brandIcons: Record<string, React.FC<{ className?: string }>> = {
  visa: ({ className }) => (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1434CB" />
      <path d="M20.88 20.4L22.44 11.6H24.84L23.28 20.4H20.88ZM17.04 11.6L14.76 17.52L14.52 16.44L13.68 12.36C13.68 12.36 13.56 11.6 12.6 11.6H8.88L8.76 11.84C8.76 11.84 9.96 12.08 11.4 12.96L13.56 20.4H16.08L19.56 11.6H17.04ZM36.96 20.4H39.24L37.32 11.6H35.4C34.56 11.6 34.32 12.24 34.32 12.24L30.6 20.4H33.12L33.6 19.08H36.72L36.96 20.4ZM34.32 17.16L35.64 13.68L36.36 17.16H34.32ZM30.24 14.04L30.6 12C30.6 12 29.52 11.52 28.44 11.52C27.24 11.52 24.48 12.12 24.48 14.64C24.48 17.04 27.84 17.04 27.84 18.36C27.84 19.68 24.84 19.32 23.76 18.48L23.4 20.52C23.4 20.52 24.48 21 26.04 21C27.6 21 30.36 19.8 30.36 17.52C30.36 15.12 26.88 14.88 26.88 13.68C26.88 12.48 29.16 12.6 30.24 14.04Z" fill="white"/>
    </svg>
  ),
  mastercard: ({ className }) => (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#F7F7F7" />
      <circle cx="18" cy="16" r="9" fill="#EB001B" />
      <circle cx="30" cy="16" r="9" fill="#F79E1B" />
      <path d="M24 8.5C26.16 10.14 27.5 12.78 27.5 16C27.5 19.22 26.16 21.86 24 23.5C21.84 21.86 20.5 19.22 20.5 16C20.5 12.78 21.84 10.14 24 8.5Z" fill="#FF5F00"/>
    </svg>
  ),
  amex: ({ className }) => (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#006FCF" />
      <path d="M10 21V11H12.8L14.4 17.2L16 11H18.8V21H17V13.4L15.2 21H13.6L11.8 13.4V21H10ZM20.4 21V11H27.2V12.8H22.6V15H27V16.8H22.6V19.2H27.2V21H20.4ZM28.8 21L31.6 16L28.8 11H31.4L33 13.8L34.6 11H37.2L34.4 16L37.2 21H34.6L33 18.2L31.4 21H28.8Z" fill="white"/>
    </svg>
  ),
  elo: ({ className }) => (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#000" />
      <path d="M13 13C11.8954 13 11 13.8954 11 15V17C11 18.1046 11.8954 19 13 19H15C16.1046 19 17 18.1046 17 17V15C17 13.8954 16.1046 13 15 13H13Z" fill="#FFCB05"/>
      <path d="M21 13C19.8954 13 19 13.8954 19 15V17C19 18.1046 19.8954 19 21 19H23C24.1046 19 25 18.1046 25 17V15C25 13.8954 24.1046 13 23 13H21Z" fill="#00A4E0"/>
      <path d="M29 13C27.8954 13 27 13.8954 27 15V17C27 18.1046 27.8954 19 29 19H31C32.1046 19 33 18.1046 33 17V15C33 13.8954 32.1046 13 31 13H29Z" fill="#EF4123"/>
      <text x="36" y="18" fill="white" fontSize="6" fontFamily="Arial" fontWeight="bold">elo</text>
    </svg>
  ),
  hipercard: ({ className }) => (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#822124" />
      <circle cx="18" cy="16" r="5" fill="#fff"/>
      <path d="M26 11H28V21H26V11ZM29 15H33V17H29V15Z" fill="white"/>
      <text x="15.5" y="18" fill="#822124" fontSize="5" fontFamily="Arial" fontWeight="bold">H</text>
    </svg>
  ),
  diners: ({ className }) => (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#0079BE" />
      <circle cx="24" cy="16" r="9" stroke="white" strokeWidth="2" fill="none"/>
      <path d="M18 16H24M24 10V22" stroke="white" strokeWidth="1.5"/>
    </svg>
  ),
};

export function CardBrandIcon({ brand, className = "h-6 w-auto" }: CardBrandIconProps) {
  const normalizedBrand = brand.toLowerCase().replace(/\s+/g, '');
  
  // Map common variations
  const brandMap: Record<string, string> = {
    'americanexpress': 'amex',
    'american_express': 'amex',
    'american express': 'amex',
    'master': 'mastercard',
    'master_card': 'mastercard',
    'diner': 'diners',
    'diners_club': 'diners',
    'dinersclub': 'diners',
    'hiper': 'hipercard',
  };

  const mappedBrand = brandMap[normalizedBrand] || normalizedBrand;
  const IconComponent = brandIcons[mappedBrand];

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // Fallback to generic credit card icon
  return <CreditCard className={className} />;
}
