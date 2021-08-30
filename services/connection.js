'use strict'

module.exports = {
  createUser: async (ssoId) => {
    const opts = {
      ssoId: ssoId.toString(),
      username: `skuser${ssoId}`,
      email: `skuser${ssoId}@interesting.io`,
      password: `temppwd${ssoId}`
    }
    const pluginStore = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    });

    const settings = await pluginStore.get({
      key: 'advanced',
    });

    if (!settings.allow_register) {
      // return ctx.badRequest(
      //   null,
      //   formatError({
      //     id: 'Auth.advanced.allow_register',
      //     message: 'Register action is currently disabled.',
      //   })
      // );
      return { error: 400, message: 'Register action is currently disabled.' };
    }

    const params = {
      ..._.omit(opts, ['confirmed', 'confirmationToken', 'resetPasswordToken']),
      provider: 'local',
    };

    // Password is required.
    if (!params.password) {
      // return ctx.badRequest(
      //   null,
      //   formatError({
      //     id: 'Auth.form.error.password.provide',
      //     message: 'Please provide your password.',
      //   })
      // );
      return { error: 400, message: 'Please provide your password.' };
    }

    // Email is required.
    if (!params.email) {
      // return ctx.badRequest(
      //   null,
      //   formatError({
      //     id: 'Auth.form.error.email.provide',
      //     message: 'Please provide your email.',
      //   })
      // );
      return { error: 400, message: 'Please provide your email.' };
    }

    // Throw an error if the password selected by the user
    // contains more than three times the symbol '$'.
    if (strapi.plugins['users-permissions'].services.user.isHashed(params.password)) {
      // return ctx.badRequest(
      //   null,
      //   formatError({
      //     id: 'Auth.form.error.password.format',
      //     message: 'Your password cannot contain more than three times the symbol `$`.',
      //   })
      // );
      return { error: 400, message: 'Your password cannot contain more than three times the symbol `$`.' };
    }

    const role = await strapi
      .query('role', 'users-permissions')
      .findOne({ type: settings.default_role }, []);

    if (!role) {
      // return ctx.badRequest(
      //   null,
      //   formatError({
      //     id: 'Auth.form.error.role.notFound',
      //     message: 'Impossible to find the default role.',
      //   })
      // );
      return { error: 400, message: 'Impossible to find the default role.' };
    }

    // Check if the provided email is valid or not.
    const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const isEmail = emailRegExp.test(params.email);

    if (isEmail) {
      params.email = params.email.toLowerCase();
    } else {
      // return ctx.badRequest(
      //   null,
      //   formatError({
      //     id: 'Auth.form.error.email.format',
      //     message: 'Please provide valid email address.',
      //   })
      // );
      return { error: 400, message: 'Please provide valid email address.' };
    }

    params.role = role.id;
    params.password = await strapi.plugins['users-permissions'].services.user.hashPassword(params);

    const user = await strapi.query('user', 'users-permissions').findOne({
      email: params.email,
    });

    if (user && user.provider === params.provider) {
      // return ctx.badRequest(
      //   null,
      //   formatError({
      //     id: 'Auth.form.error.email.taken',
      //     message: 'Email is already taken.',
      //   })
      // );
      return { error: 400, message: 'Email is already taken.' };
    }

    if (user && user.provider !== params.provider && settings.unique_email) {
      // return ctx.badRequest(
      //   null,
      //   formatError({
      //     id: 'Auth.form.error.email.taken',
      //     message: 'Email is already taken.',
      //   })
      // );
      return { error: 400, message: 'Email is already taken.' };
    }

    try {
      if (!settings.email_confirmation) {
        params.confirmed = true;
      }
      // strapi.log.info("register issue refresh_token before")
      const user = await strapi.query('user', 'users-permissions').create(params);

      // let refreshToken = strapi.plugins['users-permissions'].services.refreshtoken.issue(user.id, ctx.request.header['user-agent']);
      // await strapi.query('user', 'users-permissions').update({ id: user.id }, { refreshToken });

      const sanitizedUser = sanitizeEntity(user, {
        model: strapi.query('user', 'users-permissions').model,
      });

      // if (settings.email_confirmation) {
      //   try {
      //     await strapi.plugins['users-permissions'].services.user.sendConfirmationEmail(user);
      //   } catch (err) {
      //     return ctx.badRequest(null, err);
      //   }

      //   return ctx.send({ user: sanitizedUser });
      // }

      // const jwt = strapi.plugins['users-permissions'].services.jwt.issue(_.pick(user, ['id']));

      return { error: null, data: sanitizedUser }
      // return ctx.send({
      //   jwt,
      //   refreshToken,
      //   user: sanitizedUser,
      // });
    } catch (err) {
      // strapi.log.error("register error ", err);
      const adminError = _.includes(err.message, 'username')
        ? {
          id: 'Auth.form.error.username.taken',
          message: 'Username already taken',
        }
        : { id: 'Auth.form.error.email.taken', message: 'Email already taken' };

      // ctx.badRequest(null, formatError(adminError));
      return { error: 400, message: adminError.message };

    }
  },
  disconnect: async (ssoId, close = true) => {
    try {
      let data = await strapi.query('user', 'users-permissions').findOne({ ssoId });
      if(!data) {
        return false
      }
      await strapi.io.of('/').adapter.remoteDisconnect(data.socketId, close);
      await strapi.query('user', 'users-permissions').update({ id: data.id }, { socketId: '' });
      return true
    } catch (error) {
      return false
    }
  }
}