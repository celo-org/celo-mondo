import { Form, Formik, FormikErrors } from 'formik';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SolidButtonWithSpinner } from 'src/components/buttons/SolidButtonWithSpinner';
import { ImageOrIdenticon } from 'src/components/icons/Identicon';
import { TextField } from 'src/components/input/TextField';
import {
  EIP712Delegatee,
  RegisterDelegateFormValues,
  RegisterDelegateFormValuesSchema,
} from 'src/features/delegation/types';
import { useAccount, useSignTypedData } from 'wagmi';

// @ts-ignore TODO fix this
const initialValues: RegisterDelegateFormValues = {
  name: 'name',
  description: 'description',
  twitterUrl: 'https://x.com/celo',
  websiteUrl: '',
  interests: 'some, interests',
  verificationUrl: '',
};

function useSignedData() {
  const { signTypedDataAsync } = useSignTypedData();
  return ({
    name,
    address,
    verificationUrl,
  }: Pick<RegisterDelegateFormValues, 'address' | 'name' | 'verificationUrl'>) => {
    return signTypedDataAsync({
      ...EIP712Delegatee,
      message: {
        name,
        address,
        verificationUrl,
      },
    });
  };
}

export function DelegateRegistrationForm({
  defaultFormValues,
}: {
  defaultFormValues?: Partial<RegisterDelegateFormValues>;
}) {
  const { address } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null);
  const signForm = useSignedData();

  const validate = (values: RegisterDelegateFormValues, file: File | null) => {
    // if (!delegations) return { amount: 'Form data not ready' };
    // if (txPlanIndex > 0) return {};

    return validateForm(values, file);
  };

  const [image, setImage] = useState<File | null>(null);
  const imageUrl = useMemo(() => {
    if (image) {
      return URL.createObjectURL(image);
    }

    return undefined;
  }, [image]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('hello');

    if (e.target.files) {
      setImage(e.target.files[0]);
    }
  };

  if (pullRequestUrl) {
    return (
      <p>
        {/* TODO rephrase */}
        Your delegate registration has been submitted. You can track the status of your pull request
        <Link href={pullRequestUrl}>here</Link>
      </p>
    );
  }

  return (
    <Formik<RegisterDelegateFormValues>
      initialValues={{
        ...defaultFormValues,
        ...initialValues,
      }}
      onSubmit={async (values) => {
        setIsSubmitting(true);

        const signature = await signForm(values);

        const request = new FormData();

        request.append('image', image as Blob);
        request.append('name', values.name);
        request.append('interests', values.interests);
        request.append('description', values.description);
        request.append('signature', signature);

        if (values.twitterUrl) {
          request.append('twitterUrl', values.twitterUrl);
        }

        if (values.websiteUrl) {
          request.append('websiteUrl', values.websiteUrl);
        }

        request.append('verificationUrl', values.verificationUrl);
        request.append('address', address!);

        try {
          const response = await fetch('/delegate/api/register', {
            method: 'POST',
            body: request,
          });

          if (response.ok) {
            console.log("I'm here");
            const json = await response.json();
            console.log(json);

            console.log(json.url);
            // TODO add a response type
            setPullRequestUrl(json.url);
            console.log('should be set now');
          } else {
            console.log('failure');
          }
        } catch (err) {
          // TODO handle error
        }

        setIsSubmitting(false);
      }}
      onReset={() => {
        console.log('resetting');
      }}
      validate={(values) => validate(values, image)}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ errors }) => (
        <Form className="mt-4 flex flex-1 flex-col justify-between">
          <div className={'space-y-2'}>
            {isSubmitting && <p>Submitting right now!</p>}
            {!isSubmitting && <p>Not submitting atm</p>}
            <div className="relative flex flex-col space-y-1.5">
              <div className="flex justify-between">
                <label htmlFor={'address'} className="pl-0.5 text-xs font-medium">
                  Address
                </label>
              </div>
              <p>{defaultFormValues?.address}</p>
              <p className={'text-xs'}>
                Your connected wallet address is provided automatically and cannot be changed, if
                you want to use different address please raise a PR
              </p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'address'} className="pl-0.5 text-xs font-medium">
                  Name
                </label>
              </div>
              <TextField
                name="name"
                placeholder="Your name"
                defaultValue={defaultFormValues?.name}
              />
              {errors.name && <p className={'text-xs text-red-500'}>{errors.name}</p>}
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'interests'} className="pl-0.5 text-xs font-medium">
                  Interests
                </label>
              </div>
              <TextField
                name="interests"
                placeholder="Blockchain, NFTs"
                defaultValue={defaultFormValues?.interests}
              />
              {errors.interests && <p className={'text-xs text-red-500'}>{errors.interests}</p>}
              <p className={'text-xs'}>Provide a comma separated list of your interests</p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'description'} className="pl-0.5 text-xs font-medium">
                  Description
                </label>
              </div>
              <TextField
                name="description"
                placeholder="Your description"
                defaultValue={defaultFormValues?.description}
              />
              {errors.description && <p className={'text-xs text-red-500'}>{errors.description}</p>}
              <p className={'text-xs'}>Provide a short description of yourself</p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'twitterUrl'} className="pl-0.5 text-xs font-medium">
                  Twitter
                </label>
              </div>
              <TextField
                name="twitterUrl"
                placeholder="https://x.com/celo"
                defaultValue={defaultFormValues?.twitterUrl}
              />
              {errors.twitterUrl && <p className={'text-xs text-red-500'}>{errors.twitterUrl}</p>}
              <p className={'text-xs'}>Provide a link to your X (Twitter) profile</p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'websiteUrl'} className="pl-0.5 text-xs font-medium">
                  Website
                </label>
              </div>
              <TextField
                name="websiteUrl"
                placeholder="https://celo.org/"
                defaultValue={defaultFormValues?.websiteUrl}
              />
              {errors.websiteUrl && <p className={'text-xs text-red-500'}>{errors.websiteUrl}</p>}
              <p className={'text-xs'}>Provide a link to your website</p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'verificationUrl'} className="pl-0.5 text-xs font-medium">
                  Verification Link
                </label>
              </div>
              <TextField
                name="verificationUrl"
                placeholder="https://celo.org/"
                defaultValue={defaultFormValues?.verificationUrl}
              />
              {errors.verificationUrl && (
                <p className={'text-xs text-red-500'}>{errors.verificationUrl}</p>
              )}
              <p className={'text-xs'}>TODO add a descriptive text on why is it needed</p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'websiteUrl'} className="pl-0.5 text-xs font-medium">
                  Image
                </label>
              </div>
              <input type="file" name="image" onChange={handleFileChange} />
              {image && <ImageOrIdenticon imgSrc={imageUrl} address={address!} size={90} />}
              {errors.image! && <p className={'text-xs text-red-500'}>{errors.image!}</p>}
              <p className={'text-xs'}>Provide an image to use as your delegate logo</p>
            </div>
          </div>
          <SolidButtonWithSpinner type="submit" isLoading={isSubmitting}>
            Register Delegatee
          </SolidButtonWithSpinner>
        </Form>
      )}
    </Formik>
  );
}

function validateForm(
  values: RegisterDelegateFormValues,
  imageFile: File | null,
  // delegations: DelegationBalances,
): FormikErrors<RegisterDelegateFormValues> {
  // TODO do the same for backend
  const processedValues = {
    ...values,
    interests: values.interests
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i),
    links: {} as Record<string, string>,
  };

  if (values.twitterUrl) {
    processedValues.links.twitter = values.twitterUrl;
  }

  if (values.websiteUrl) {
    processedValues.links.website = values.websiteUrl;
  }

  const parseResult = RegisterDelegateFormValuesSchema.safeParse(processedValues);
  let errors: Record<string, string> = {};

  if (!parseResult.success) {
    errors = {
      ...errors,
      ...Object.fromEntries(parseResult.error.errors.map((e) => [e.path.join('.'), e.message])),
    };

    if (errors['links.twitter']) {
      errors.twitterUrl = errors['links.twitter'];
    }

    if (errors['links.website']) {
      errors.websiteUrl = errors['links.website'];
    }
  }

  if (!imageFile) {
    errors.image = 'Image required';
  } else {
    if (!imageFile.type.startsWith('image')) {
      errors.image = 'Invalid image';
    }
  }

  if (!values.twitterUrl && !values.websiteUrl) {
    errors = {
      ...errors,
      twitterUrl: 'At least one link required',
      websiteUrl: 'At least one link required',
    };
  }

  return errors;
}
